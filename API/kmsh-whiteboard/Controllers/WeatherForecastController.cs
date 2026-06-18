using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers
{
    /// <summary>
    /// 天氣預報範例 Controller — .NET 專案範本自動產生的測試端點，與護理白板功能無關，
    /// 資料為亂數產生（非自建 DB、非外部 HIS API），僅用於確認服務正常運作，可於正式環境移除。
    /// </summary>
    [ApiController]
    [Route("[controller]")]
    public class WeatherForecastController : ControllerBase
    {
        // 天氣描述對照表，回傳時以亂數從中挑選一個字串
        private static readonly string[] Summaries = new[]
        {
            "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
        };

        private readonly ILogger<WeatherForecastController> _logger;

        public WeatherForecastController(ILogger<WeatherForecastController> logger)
        {
            _logger = logger;
        }

        /// <summary>取得未來 5 天的模擬天氣預報（路由：GET /WeatherForecast）</summary>
        /// <remarks>回傳 5 筆亂數產生的預報資料（日期、攝氏溫度、天氣描述），純為範例展示用途。</remarks>
        [HttpGet(Name = "GetWeatherForecast")]
        public IEnumerable<WeatherForecast> Get()
        {
            // 產生 1~5 共 5 天的預報：日期為今日起算、溫度與描述皆為亂數
            return Enumerable.Range(1, 5).Select(index => new WeatherForecast
            {
                Date = DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                TemperatureC = Random.Shared.Next(-20, 55),
                Summary = Summaries[Random.Shared.Next(Summaries.Length)]
            })
            .ToArray();
        }
    }
}
