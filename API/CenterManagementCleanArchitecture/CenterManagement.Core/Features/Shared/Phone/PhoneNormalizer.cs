using System.Text;

namespace CenterManagement.Core.Features.Shared.Phone;

public static class PhoneNormalizer
{
    public static bool TryNormalize(string? raw, out string? canonical, out string? error)
    {
        canonical = null;
        error = null;

        if (string.IsNullOrWhiteSpace(raw))
        {
            error = "رقم الهاتف مطلوب";
            return false;
        }

        // Remove spaces, symbols etc but keep digits and +
        var sb = new StringBuilder(raw.Length);
        for (int i = 0; i < raw.Length; i++)
        {
            var c = raw[i];
            // Arabic-Indic digits
            if (c >= '\u0660' && c <= '\u0669')
            {
                sb.Append((char)('0' + (c - '\u0660')));
                continue;
            }
            // Extended Arabic-Indic
            if (c >= '\u06F0' && c <= '\u06F9')
            {
                sb.Append((char)('0' + (c - '\u06F0')));
                continue;
            }
            if (char.IsDigit(c))
            {
                sb.Append(c);
                continue;
            }
            if (c == '+' && sb.Length == 0)
            {
                sb.Append(c);
                continue;
            }
            // skip other symbols/spaces
        }

        var cleaned = sb.ToString();
        if (string.IsNullOrEmpty(cleaned))
        {
            error = "رقم الهاتف غير صالح";
            return false;
        }

        // Handle Egyptian forms
        if (cleaned.StartsWith("+20"))
        {
            var rest = cleaned.Substring(3);
            if (rest.Length == 10 && rest.StartsWith("1") && IsEgyptianMobileStart(rest[0], rest[1]))
            {
                canonical = "0" + rest; // local 01xxxxxxxxx
                return true;
            }
        }
        if (cleaned.StartsWith("0020"))
        {
            var rest = cleaned.Substring(4);
            if (rest.Length == 10 && rest.StartsWith("1"))
            {
                // rest is 1xxxxxxxxx
                canonical = "0" + rest;
                return true;
            }
        }
        if (cleaned.StartsWith("20") && cleaned.Length == 12)
        {
            // 20 + 1xxxxxxxxx
            var rest = cleaned.Substring(2);
            if (rest.StartsWith("1") && IsEgyptianMobile(rest))
            {
                canonical = "0" + rest;
                return true;
            }
        }
        if (cleaned.StartsWith("01") && cleaned.Length == 11)
        {
            var rest = cleaned.Substring(1); // 1xxxxxxxxx
            if (IsEgyptianMobile("1" + rest.Substring(1)) || IsValidEgyptianLocal(cleaned))
            {
                canonical = cleaned;
                return true;
            }
        }
        if (cleaned.StartsWith("1") && cleaned.Length == 10)
        {
            // maybe just 1xxxxxxxxx
            var local = "0" + cleaned;
            if (IsValidEgyptianLocal(local))
            {
                canonical = local;
                return true;
            }
        }

        // Check if it's Egyptian local
        if (IsValidEgyptianLocal(cleaned))
        {
            canonical = cleaned;
            return true;
        }

        // Not Egyptian - if it's international valid: starts with + and 8-15 digits total after +
        if (cleaned.StartsWith("+"))
        {
            var digits = cleaned.Substring(1);
            if (digits.Length >= 8 && digits.Length <= 15 && AllDigits(digits))
            {
                // يُترك كما هو - keep as-is (with +)
                canonical = cleaned;
                return true;
            }
            error = "رقم الهاتف غير صالح";
            return false;
        }

        // If it's all digits and not Egyptian local, check if it could be international without +
        // but instruction says "لو غير مصري لكنه دولي صالح (+ و8-15 رقم) يُترك كما هو" - so needs +
        error = "رقم الهاتف غير صالح";
        return false;
    }

    private static bool IsValidEgyptianLocal(string cleaned)
    {
        if (cleaned.Length != 11) return false;
        if (!cleaned.StartsWith("01")) return false;
        var third = cleaned[2];
        // 0,1,2,5
        if (third != '0' && third != '1' && third != '2' && third != '5') return false;
        for (int i = 3; i < cleaned.Length; i++) if (!char.IsDigit(cleaned[i])) return false;
        return true;
    }

    private static bool IsEgyptianMobile(string rest) // rest starts with 1 and is 10 digits total? 20+1xxxxxxxxx means rest is 1xxxxxxxxx (10 chars)
    {
        if (rest.Length != 10) return false;
        if (!rest.StartsWith("1")) return false;
        var second = rest[1];
        if (second != '0' && second != '1' && second != '2' && second != '5') return false;
        for (int i = 2; i < rest.Length; i++) if (!char.IsDigit(rest[i])) return false;
        return true;
    }

    private static bool IsEgyptianMobileStart(char first, char second) // for rest starting at pos after country code
    {
        if (first != '1') return false;
        if (second != '0' && second != '1' && second != '2' && second != '5') return false;
        return true;
    }

    private static bool AllDigits(string s)
    {
        for (int i = 0; i < s.Length; i++) if (!char.IsDigit(s[i])) return false;
        return true;
    }
}
