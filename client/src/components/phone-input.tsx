import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const countryCodes = [
  { code: "+1", label: "US/CA", flag: "US" },
  { code: "+44", label: "UK", flag: "GB" },
  { code: "+61", label: "AU", flag: "AU" },
  { code: "+33", label: "FR", flag: "FR" },
  { code: "+49", label: "DE", flag: "DE" },
  { code: "+81", label: "JP", flag: "JP" },
  { code: "+86", label: "CN", flag: "CN" },
  { code: "+91", label: "IN", flag: "IN" },
  { code: "+52", label: "MX", flag: "MX" },
  { code: "+55", label: "BR", flag: "BR" },
  { code: "+34", label: "ES", flag: "ES" },
  { code: "+39", label: "IT", flag: "IT" },
  { code: "+82", label: "KR", flag: "KR" },
  { code: "+65", label: "SG", flag: "SG" },
  { code: "+971", label: "AE", flag: "AE" },
  { code: "+31", label: "NL", flag: "NL" },
  { code: "+46", label: "SE", flag: "SE" },
  { code: "+41", label: "CH", flag: "CH" },
  { code: "+64", label: "NZ", flag: "NZ" },
  { code: "+353", label: "IE", flag: "IE" },
];

function parsePhoneValue(value: string): { countryCode: string; number: string } {
  if (!value) return { countryCode: "+1", number: "" };

  const sorted = [...countryCodes].sort((a, b) => b.code.length - a.code.length);
  for (const cc of sorted) {
    if (value.startsWith(cc.code)) {
      return { countryCode: cc.code, number: value.slice(cc.code.length).trim() };
    }
  }

  if (value.startsWith("+")) {
    const match = value.match(/^(\+\d{1,4})\s*(.*)/);
    if (match) return { countryCode: match[1], number: match[2] };
  }

  return { countryCode: "+1", number: value };
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "data-testid"?: string;
}

export function PhoneInput({ value, onChange, placeholder, "data-testid": testId }: PhoneInputProps) {
  const parsed = parsePhoneValue(value);
  const [countryCode, setCountryCode] = useState(parsed.countryCode);
  const [number, setNumber] = useState(parsed.number);
  const normalizedRef = useRef(false);

  useEffect(() => {
    const p = parsePhoneValue(value);
    setCountryCode(p.countryCode);
    setNumber(p.number);

    if (p.number && value && !value.startsWith("+") && !normalizedRef.current) {
      normalizedRef.current = true;
      onChange(`${p.countryCode} ${p.number}`);
    }
  }, [value]);

  const handleCodeChange = (newCode: string) => {
    setCountryCode(newCode);
    onChange(number ? `${newCode} ${number}` : "");
  };

  const handleNumberChange = (newNumber: string) => {
    const cleaned = newNumber.replace(/[^\d\s\-()]/g, "");
    setNumber(cleaned);
    onChange(cleaned ? `${countryCode} ${cleaned}` : "");
  };

  return (
    <div className="flex gap-2">
      <Select value={countryCode} onValueChange={handleCodeChange}>
        <SelectTrigger
          className="w-[90px] shrink-0"
          data-testid={testId ? `${testId}-code` : undefined}
          aria-label="Country code"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {countryCodes.map((cc) => (
            <SelectItem key={cc.code} value={cc.code}>
              {cc.code} {cc.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={number}
        onChange={(e) => handleNumberChange(e.target.value)}
        placeholder={placeholder || "555 123 4567"}
        data-testid={testId}
        aria-label="Phone number"
      />
    </div>
  );
}
