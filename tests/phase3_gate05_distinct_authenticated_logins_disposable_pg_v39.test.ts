/**
 * Gate05 "real login" proof: four DIFFERENT independently authenticated
 * PostgreSQL16 TCP clients, each with a random short-lived password and
 * NOINHERIT/SET-TRUE membership in exactly one restricted NOLOGIN role.
 *
 * Runs only on GitHub Actions' fixed disposable postgres:16 service:
 * zero AeroDataBox API keys, no production DB, owner credentials, GitHub
 * safety environment, authorization signatures, real scope or FIDS HTTP.
 * Uses a unique temporary DB AND uniquely renamed migration roles to avoid
 * racing other disposable PG tests in the same cluster. Removes everything.
 */
import {describe,it,expect} from "vitest";
import {randomBytes,randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import pg from "pg";

const CI_DB="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const ROOT_DB="postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable";
const enabled=process.env.GITHUB_ACTIONS==="true" &&
  process.env.NODE_ENV==="test" &&
  process.env.DATABASE_URL===CI_DB &&
  !process.env.AERODATABOX_API_KEY &&
  process.env.ADB_AUTO_COLLECT==="0";
const guarded=enabled?describe:describe.skip;
const types=["commission","activate","dispatch","safety"] as const;
type RoleType=typeof types[number];

const sources=[
  "V0066__gate05_scoped_fids_budget_v39.sql",
  "V0067__gate05_fids_function_only_roles_v39.sql",
  "V0068__gate05_single_open_scope_v39.sql",
  "V0069__gate05_permit_bound_prepared_only_v39.sql",
  "V0070__gate05_exact_permit_activation_v39.sql"
];
const functionSql={
  commission:"SELECT prepared_scope_id,prepared_queries "+
    "FROM clean.prepare_gate05_permitted_scope_v39($1::uuid,$2::text)",
  activate:"SELECT scope_id,state,expires_at_utc "+
    "FROM clean.activate_gate05_prepared_scope_v39($1::uuid,$2::text)",
  dispatch:"SELECT clean.reserve_gate05_fids_attempt_v39("+
    "$1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10) AS reserved",
  safety:"SELECT state,reserved_attempts,reserved_units "+
    "FROM clean.stop_gate05_fids_pilot_v39($1::uuid,$2::text)"
};
const procedures={
  commission:"clean.prepare_gate05_permitted_scope_v39(uuid,text)",
  activate:"clean.activate_gate05_prepared_scope_v39(uuid,text)",
  dispatch:"clean.reserve_gate05_fids_attempt_v39(uuid,uuid,text,text,text,text,text,text,integer,integer)",
  safety:"clean.stop_gate05_fids_pilot_v39(uuid,text)"
};

guarded("Gate05 real distinct TCP LOGINs + function ACL + full lifecycle (DISPOSABLE PG16 ONLY)",()=>{
  it("uses 4 separate authenticated short-lived logins, limits 12 reserved units, STOPs and cleans DB + roles",async()=>{
    const unique=randomBytes(5).toString("hex");
    const dbName="g05_ci_"+unique;
    const roleNames:Record<RoleType,string>={
      commission:"g05_c_"+unique,
      activate:"g05_a_"+unique,
      dispatch:"g05_d_"+unique,
      safety:"g05_s_"+unique
    };
    const loginNames:Record<RoleType,string>={
      commission:"g05_lc_"+unique,
      activate:"g05_la_"+unique,
      dispatch:"g05_ld_"+unique,
      safety:"g05_ls_"+unique
    };
    const oldNames:Record<RoleType,string>={
      commission:"gate05_fids_commission_v39",
      activate:"gate05_fids_activate_v39",
      dispatch:"gate05_fids_dispatch_v39",
      safety:"gate05_fids_safety_v39"
    };
    const functionOids={} as Record<RoleType,number>;
    const credentials:Record<RoleType,string>={
      commission:randomBytes(32).toString("hex"),
      activate:randomBytes(32).toString("hex"),
      dispatch:randomBytes(32).toString("hex"),
      safety:randomBytes(32).toString("hex")
    };
    const root=new pg.Client({connectionString:ROOT_DB,
      connectionTimeoutMillis:7000,statement_timeout:15000});
    let rootConnected=false,dbCreated=false,admin:pg.Client|null=null;
    const clients:Partial<Record<RoleType,pg.Client>>={};
    const cleanupErrors:string[]=[];
    const close=async(c:pg.Client|null|undefined)=>{
      if(!c)return;
      try{await c.end();}catch(e){cleanupErrors.push(
        "client_close:"+(e instanceof Error?e.message:"unknown")
      );}
    };
    const qIdent=(s:string)=>{
      if(!/^[a-z][a-z0-9_]{0,60}$/.test(s))
        throw Error("CI_IDENTIFIER_SHAPE");
      return '"'+s+'"';
    };
    const scopedClient=(kind:RoleType)=>{
      const url=new URL(ROOT_DB);
      url.pathname="/"+dbName;
      url.username=loginNames[kind];
      url.password=credentials[kind];
      return new pg.Client({connectionString:url.toString(),
        connectionTimeoutMillis:7000,statement_timeout:8000,
        query_timeout:10000,lock_timeout:2000});
    };
    const scope=randomUUID(),auth="AUTH-G05-CI-TCP-LOGIN-0001",
      digest="e".repeat(64),cycle="ci-real-authenticated-roles",
      off="a".repeat(64),on="b".repeat(64);
    const args=(hash:string,n:number)=>[
      randomUUID(),scope,auth,digest,cycle,"WSSS",hash,
      n===1?"fids_base":"fids_retry",n,2
    ];
    const execute=async(role:RoleType,action:RoleType,
      params:unknown[],expectedError?:string)=>{
      const db=clients[role];
      if(!db)throw Error("CI_MISSING_LOGIN_CLIENT");
      await db.query("BEGIN");
      let committed=false;
      try{
        await db.query("SET LOCAL ROLE "+qIdent(roleNames[role]));
        const id=(await db.query("SELECT current_user AS who,session_user AS login")).rows[0];
        expect(id).toEqual({who:roleNames[role],login:loginNames[role]});
        if(expectedError){
          await expect(db.query(functionSql[action],params))
            .rejects.toMatchObject({code:expectedError});
          return null;
        }
        const output=await db.query(functionSql[action],params);
        await db.query("COMMIT");committed=true;
        return output.rows;
      }finally{
        if(!committed)await db.query("ROLLBACK").catch(()=>{});
      }
    };
    try{
      await root.connect();rootConnected=true;
      const rootIdentity=(await root.query(
        "SELECT current_database() AS db,current_user AS who"
      )).rows[0];
      expect(rootIdentity).toEqual({db:"postgres",who:"postgres"});
      await root.query("CREATE DATABASE "+qIdent(dbName));
      dbCreated=true;
      const adminUrl=new URL(ROOT_DB);adminUrl.pathname="/"+dbName;
      admin=new pg.Client({connectionString:adminUrl.toString(),
        connectionTimeoutMillis:7000,statement_timeout:12000});
      await admin.connect();
      await admin.query("CREATE SCHEMA clean");
      for(const migration of sources){
        let sql=readFileSync("migrations/staged/"+migration,"utf8");
        // Isolated global roles; no collision with other CI test files.
        for(const type of types){
          sql=sql.replaceAll(oldNames[type],roleNames[type]);
        }
        await admin.query(sql);
      }
      // Confirm the ephemeral functions are the production candidate bodies.
      for(const type of types){
        const oid=(await admin.query(
          "SELECT to_regprocedure($1)::oid::integer AS oid",
          [procedures[type]]
        )).rows[0]?.oid;
        expect(Number.isInteger(oid)).toBe(true);
        functionOids[type]=oid;
      }
      await root.query("REVOKE CONNECT ON DATABASE "+qIdent(dbName)+" FROM PUBLIC");
      const until=new Date(Date.now()+10*60000).toISOString();
      for(const type of types){
        const login=qIdent(loginNames[type]);
        const group=qIdent(roleNames[type]);
        // Identifiers and passwords generated in memory; never printed.
        await root.query("CREATE ROLE "+login+
          " LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE "+
          "NOREPLICATION NOBYPASSRLS PASSWORD '"+credentials[type]+
          "' VALID UNTIL '"+until+"'");
        await root.query("GRANT "+group+" TO "+login+
          " WITH ADMIN FALSE, INHERIT FALSE, SET TRUE");
        await root.query("GRANT CONNECT ON DATABASE "+qIdent(dbName)+
          " TO "+login);
      }
      for(const type of types){
        clients[type]=scopedClient(type);
        await clients[type]!.connect();
        const id=(await clients[type]!.query(
          "SELECT session_user AS login,current_user AS current_role, "+
          "current_database() AS db"
        )).rows[0];
        expect(id).toEqual({login:loginNames[type],
          current_role:loginNames[type],db:dbName});
        for(const fn of types){
          const has=(await clients[type]!.query(
            "SELECT has_function_privilege(current_user, "+
            "$1::oid,'EXECUTE') AS allowed",
            [functionOids[fn]]
          )).rows[0].allowed;
          expect(has).toBe(false); // explicit SET ROLE required, NOINHERIT
        }
        expect((await clients[type]!.query(
          "SELECT has_schema_privilege(current_user,'clean','USAGE') AS allowed"
        )).rows[0].allowed).toBe(false);
        // No ability to assume a different functional identity.
        const wrong=types.find(k=>k!==type)!;
        await expect(clients[type]!.query(
          "SET ROLE "+qIdent(roleNames[wrong])
        )).rejects.toMatchObject({code:"42501"});
        await clients[type]!.query("BEGIN");
        try{
          await clients[type]!.query(
            "SET LOCAL ROLE "+qIdent(roleNames[type])
          );
          for(const fn of types){
            const has=(await clients[type]!.query(
              "SELECT has_function_privilege(current_user,"+
              "$1::oid,'EXECUTE') AS allowed",
              [functionOids[fn]]
            )).rows[0].allowed;
            expect(has).toBe(fn===type);
          }
          for(const table of ["gate05_fids_pilot_scope_v39",
            "gate05_fids_allowed_query_v39","gate05_fids_attempt_v39",
            "gate05_fids_commission_permit_v39"]){
            const can=(await clients[type]!.query(
              "SELECT has_table_privilege(current_user,$1,'UPDATE') AS allowed",
              ["clean."+table]
            )).rows[0].allowed;
            expect(can).toBe(false);
          }
        }finally{
          await clients[type]!.query("ROLLBACK");
        }
      }
      const future=new Date(Date.now()+12000);
      const expiry=new Date(Date.now()+15*60000);
      const reset=new Date(Date.now()+2*86400_000);
      await admin.query(
        "INSERT INTO clean.gate05_fids_commission_permit_v39 "+
        "(scope_id,authorization_id,authorization_sha256,cycle_id,icao,"+
        "starts_at_utc,expires_at_utc,provider_reset_utc,"+
        "no_location_query_sha256,location_query_sha256) "+
        "VALUES ($1,$2,$3,$4,'WSSS',$5,$6,$7,$8,$9)",
        [scope,auth,digest,cycle,future,expiry,reset,off,on]
      );
      await execute("commission","commission",[scope,"f".repeat(64)],"P0001");
      expect(await execute("commission","commission",[scope,digest]))
        .toEqual([{prepared_scope_id:scope,prepared_queries:2}]);
      await execute("commission","commission",[scope,digest],"P0001");
      await execute("commission","activate",[scope,digest],"42501");
      await execute("activate","commission",[scope,digest],"42501");
      await execute("dispatch","commission",[scope,digest],"42501");
      await execute("safety","activate",[scope,digest],"42501");
      await execute("activate","activate",[scope,digest],"P0001");

      const receipt=(await admin.query(
        "SELECT state FROM clean.gate05_fids_pilot_scope_v39 WHERE scope_id=$1",
        [scope]
      )).rows[0];
      expect(receipt?.state).toBe("PREPARED");
      expect((await admin.query(
        "SELECT consumed_at_utc IS NOT NULL AS consumed "+
        "FROM clean.gate05_fids_commission_permit_v39 WHERE scope_id=$1",
        [scope]
      )).rows[0].consumed).toBe(true);

      const delay=future.getTime()-Date.now()+350;
      if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay));
      expect(await execute("activate","activate",[scope,digest]))
        .toMatchObject([{scope_id:scope,state:"ACTIVE"}]);
      await execute("activate","activate",[scope,digest],"P0001");
      await execute("activate","dispatch",args(off,1),"42501");
      await execute("safety","dispatch",args(off,1),"42501");
      await execute("dispatch","safety",[scope,"SAFETY_ABORT"],"42501");
      for(let n=1;n<=3;n++){
        for(const hash of [off,on]){
          expect(await execute("dispatch","dispatch",args(hash,n)))
            .toEqual([{reserved:true}]);
        }
      }
      await execute("dispatch","dispatch",args(off,3),"P0001");
      await execute("dispatch","dispatch",args(on,4),"P0001");
      const counted=(await admin.query(
        "SELECT count(*)::int AS attempts,"+
        "coalesce(sum(units),0)::int AS reserved_units "+
        "FROM clean.gate05_fids_attempt_v39 WHERE scope_id=$1",[scope]
      )).rows[0];
      expect(counted).toEqual({attempts:6,reserved_units:12});
      const terminal=await execute("safety","safety",[scope,"SAFETY_ABORT"]);
      expect(terminal).toEqual([{
        state:"STOPPED",reserved_attempts:"6",reserved_units:"12"
      }]);
      expect(await execute("safety","safety",[scope,"SAFETY_ABORT"]))
        .toEqual(terminal);
      await execute("dispatch","dispatch",args(on,3),"P0001");
      await execute("activate","activate",[scope,digest],"P0001");
      expect((await admin.query(
        "SELECT state,stop_reason,base_used_units,retry_used_units "+
        "FROM clean.gate05_fids_pilot_scope_v39 WHERE scope_id=$1",[scope]
      )).rows[0]).toEqual({state:"STOPPED",stop_reason:"SAFETY_ABORT",
        base_used_units:4,retry_used_units:8});
      // No HTTP adapter is imported or called. Six SQL reservations are
      // 12 conservatively booked units, but 0 provider units billed.
      expect(process.env.AERODATABOX_API_KEY).toBeFalsy();
    }finally{
      for(const type of types)await close(clients[type]);
      await close(admin);
      if(rootConnected){
        if(dbCreated){
          try{await root.query(
            "DROP DATABASE IF EXISTS "+qIdent(dbName)+" WITH (FORCE)"
          );}catch(e){cleanupErrors.push(
            "database_drop:"+(e instanceof Error?e.message:"unknown")
          );}
        }
        for(const type of types){
          try{await root.query(
            "DROP ROLE IF EXISTS "+qIdent(loginNames[type])
          );}catch(e){cleanupErrors.push(
            "login_drop:"+type+":"+(e instanceof Error?e.message:"unknown")
          );}
        }
        for(const type of types){
          try{await root.query(
            "DROP ROLE IF EXISTS "+qIdent(roleNames[type])
          );}catch(e){cleanupErrors.push(
            "group_drop:"+type+":"+(e instanceof Error?e.message:"unknown")
          );}
        }
        try{
          expect((await root.query(
            "SELECT count(*)::int AS n FROM pg_database WHERE datname=$1",
            [dbName]
          )).rows[0].n).toBe(0);
          expect((await root.query(
            "SELECT count(*)::int AS n FROM pg_roles WHERE rolname=ANY($1)",
            [Object.values(roleNames).concat(Object.values(loginNames))]
          )).rows[0].n).toBe(0);
        }catch(e){cleanupErrors.push(
          "readback:"+(e instanceof Error?e.message:"unknown")
        );}
        await close(root);
      }
      expect(cleanupErrors).toEqual([]);
    }
  },70000);
});
