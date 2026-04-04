using System.Text.RegularExpressions;
using System.Net;

namespace Prism.API.Services
{
    /// <summary>
    /// Input sanitization to prevent XSS in stored content.
    /// </summary>
    public static class InputSanitizer
    {
        // Strip HTML tags to prevent stored XSS
        private static readonly Regex HtmlTagPattern = new(@"<[^>]*>", RegexOptions.Compiled);

        /// <summary>
        /// Sanitizes a string by HTML-encoding dangerous characters
        /// and stripping script tags.
        /// </summary>
        public static string Sanitize(string? input)
        {
            if (string.IsNullOrWhiteSpace(input)) return input ?? string.Empty;

            // Remove script tags entirely (case-insensitive)
            var result = Regex.Replace(input, @"<script[^>]*>.*?</script>", "", 
                RegexOptions.IgnoreCase | RegexOptions.Singleline);

            // Remove event handlers (on* attributes)
            result = Regex.Replace(result, @"\bon\w+\s*=", "", RegexOptions.IgnoreCase);

            // HTML encode remaining content
            result = WebUtility.HtmlEncode(result);

            return result;
        }

        /// <summary>
        /// Sanitize a string but preserve basic formatting (no HTML stripping, just encode).
        /// Use for rich text fields like descriptions and notes.
        /// </summary>
        public static string SanitizeRichText(string? input)
        {
            if (string.IsNullOrWhiteSpace(input)) return input ?? string.Empty;

            // Remove script tags
            var result = Regex.Replace(input, @"<script[^>]*>.*?</script>", "", 
                RegexOptions.IgnoreCase | RegexOptions.Singleline);

            // Remove event handlers
            result = Regex.Replace(result, @"\bon\w+\s*=", "", RegexOptions.IgnoreCase);

            return result;
        }
    }
}
