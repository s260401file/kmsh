namespace kmsh_whiteboard
{
    /// <summary>
    /// ASP.NET Core Web API 範本預設產生的天氣預報資料模型（與本白板業務無關，僅為樣板殘留）。
    /// </summary>
    public class WeatherForecast
    {
        /// <summary>預報日期。</summary>
        public DateOnly Date { get; set; }

        /// <summary>攝氏溫度。</summary>
        public int TemperatureC { get; set; }

        /// <summary>華氏溫度（由攝氏換算而來，唯讀計算屬性）。</summary>
        public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);

        /// <summary>天氣摘要描述（可為空）。</summary>
        public string? Summary { get; set; }
    }
}
