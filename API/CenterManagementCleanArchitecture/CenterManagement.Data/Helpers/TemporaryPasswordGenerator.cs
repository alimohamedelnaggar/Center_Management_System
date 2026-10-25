using System.Security.Cryptography;

namespace CenterManagement.Data.Helpers;

/// <summary>Generates human-friendly temporary passwords (no ambiguous
/// characters) used when onboarding or resetting an account.</summary>
public static class TemporaryPasswordGenerator
{
    private const string Alphabet =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

    public static string Generate(int length = 10)
    {
        var buffer = new byte[length];
        RandomNumberGenerator.Fill(buffer);

        var chars = new char[length];
        for (var i = 0; i < length; i++)
            chars[i] = Alphabet[buffer[i] % Alphabet.Length];

        return new string(chars);
    }
}
