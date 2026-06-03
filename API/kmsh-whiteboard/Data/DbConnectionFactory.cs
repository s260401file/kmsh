using Microsoft.Data.SqlClient;

namespace kmsh_whiteboard.Data;

public class DbConnectionFactory
{
    private readonly string _connectionString;

    public DbConnectionFactory(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("Whiteboard")
            ?? throw new InvalidOperationException("連線字串 'Whiteboard' 未設定");
    }

    public SqlConnection Create() => new(_connectionString);
}
