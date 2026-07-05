namespace WhiteboardSync;

/// <summary>OR 欄位清洗小工具（搬用 API 端 OrReportRepository 已驗證的規則）。</summary>
public static class OrClean
{
    /// <summary>去頭尾空白（含全形空白 U+3000，.NET Trim() 視為空白）；全空→null。</summary>
    public static string? C(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    /// <summary>多值合併（去空白、跳過空白項），以「、」相連；全空→null。</summary>
    public static string? Join(params string?[] parts)
    {
        var vals = parts.Select(C).Where(v => v is not null);
        var s = string.Join("、", vals);
        return s.Length == 0 ? null : s;
    }

    /// <summary>A/O/E → 住院/門診/急診；其他原樣。</summary>
    public static string? CaseTypeText(string? c) => c switch { "A" => "住院", "O" => "門診", "E" => "急診", _ => c };

    /// <summary>依生日與手術日算實歲；不合理（負數或 ≥130）視為無效。</summary>
    public static int? Age(DateTime? birth, DateTime op)
    {
        if (birth is null) return null;
        var a = op.Year - birth.Value.Year;
        if (op < birth.Value.AddYears(a)) a--;
        return a >= 0 && a < 130 ? a : null;
    }

    /// <summary>哨兵日（如 2910-12-31＝未結束佔位）轉 null；只留 2000~2100 的合理日期。</summary>
    public static DateTime? CleanDate(DateTime? d)
        => d is null || d.Value.Year < 2000 || d.Value.Year > 2100 ? null : d.Value.Date;
}
