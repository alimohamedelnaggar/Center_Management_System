using System.Globalization;

namespace CenterManagement.Data.Commons;

public class GeneralLocalizableEntity
{
    public string Localize(string textAr, string textEN)
    {
        CultureInfo CultureInfo = Thread.CurrentThread.CurrentCulture;
        if (CultureInfo.TwoLetterISOLanguageName.ToLower().Equals("ar"))
            return textAr;
        return textEN;
    }
}
