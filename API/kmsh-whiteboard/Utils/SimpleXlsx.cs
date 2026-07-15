using System.IO.Compression;
using System.Text;

namespace kmsh_whiteboard.Utils;

/// <summary>
/// 零相依的最小 .xlsx（SpreadsheetML）產生器：以 System.IO.Compression 手工組 OOXML zip。
/// 所有儲存格用 inline string（數字/日期以文字呈現，足供報表匯出）。仿專案 docx 產生器作法。
/// </summary>
public static class SimpleXlsx
{
    public static byte[] Build(string sheetName, string[] headers, IEnumerable<string[]> rows)
    {
        var sheetXml = BuildSheetXml(headers, rows);
        const string ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        const string rNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

        var contentTypes = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
            "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>" +
            "<Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
            "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>" +
            "<Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>" +
            "</Types>";
        var rootRels = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
            $"<Relationship Id=\"rId1\" Type=\"{rNs}/officeDocument\" Target=\"xl/workbook.xml\"/>" +
            "</Relationships>";
        var workbook = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            $"<workbook xmlns=\"{ns}\" xmlns:r=\"{rNs}\">" +
            $"<sheets><sheet name=\"{EscAttr(SafeSheetName(sheetName))}\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>";
        var wbRels = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
            $"<Relationship Id=\"rId1\" Type=\"{rNs}/worksheet\" Target=\"worksheets/sheet1.xml\"/>" +
            "</Relationships>";

        using var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, true))
        {
            AddEntry(zip, "[Content_Types].xml", contentTypes);
            AddEntry(zip, "_rels/.rels", rootRels);
            AddEntry(zip, "xl/workbook.xml", workbook);
            AddEntry(zip, "xl/_rels/workbook.xml.rels", wbRels);
            AddEntry(zip, "xl/worksheets/sheet1.xml", sheetXml);
        }
        return ms.ToArray();
    }

    private static string BuildSheetXml(string[] headers, IEnumerable<string[]> rows)
    {
        var sb = new StringBuilder();
        sb.Append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>")
          .Append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetData>");
        int rowNum = 1;
        AppendRow(sb, rowNum++, headers);
        foreach (var r in rows) AppendRow(sb, rowNum++, r);
        sb.Append("</sheetData></worksheet>");
        return sb.ToString();
    }

    private static void AppendRow(StringBuilder sb, int rowNum, string[] cells)
    {
        sb.Append("<row r=\"").Append(rowNum).Append("\">");
        for (int c = 0; c < cells.Length; c++)
        {
            sb.Append("<c r=\"").Append(ColLetter(c)).Append(rowNum).Append("\" t=\"inlineStr\"><is><t xml:space=\"preserve\">")
              .Append(EscText(cells[c] ?? "")).Append("</t></is></c>");
        }
        sb.Append("</row>");
    }

    private static string ColLetter(int idx)   // 0 -> A, 25 -> Z, 26 -> AA
    {
        var sb = new StringBuilder();
        idx++;
        while (idx > 0) { int rem = (idx - 1) % 26; sb.Insert(0, (char)('A' + rem)); idx = (idx - 1) / 26; }
        return sb.ToString();
    }

    private static void AddEntry(ZipArchive zip, string name, string content)
    {
        var e = zip.CreateEntry(name);
        using var s = e.Open();
        var bytes = Encoding.UTF8.GetBytes(content);
        s.Write(bytes, 0, bytes.Length);
    }

    private static string SafeSheetName(string s)
    {
        if (string.IsNullOrWhiteSpace(s)) return "Sheet1";
        foreach (var c in new[] { '\\', '/', '?', '*', '[', ']', ':' }) s = s.Replace(c, '_');
        return s.Length > 31 ? s.Substring(0, 31) : s;
    }

    private static string EscText(string s) => s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");
    private static string EscAttr(string s) => EscText(s).Replace("\"", "&quot;");
}
