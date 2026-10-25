using System.Security.Cryptography;

namespace CenterManagement.Data.Helpers;

public static class StudentQrCodeGenerator
{
    public const string Prefix = "STU";
    public const int RandomLength = 8;
    public static readonly int TotalLength = Prefix.Length + RandomLength;

    // Crockford style alphabet: no I / L / O / U to avoid misreading on printed cards.
    private const string Alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

    public static string Generate()
    {
        var chars = new char[TotalLength];

        for (var i = 0; i < Prefix.Length; i++)
            chars[i] = Prefix[i];

        for (var i = Prefix.Length; i < chars.Length; i++)
            chars[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];

        return new string(chars);
    }

    public static bool IsValid(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return false;

        var trimmed = code.Trim();

        return trimmed.Length == TotalLength
            && trimmed.StartsWith(Prefix, StringComparison.OrdinalIgnoreCase)
            && trimmed.Skip(Prefix.Length).All(c => Alphabet.Contains(c));
    }

    public static string? Normalize(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return null;

        return code.Trim().ToUpperInvariant();
    }
}