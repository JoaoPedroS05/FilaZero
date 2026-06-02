using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Tests.Helpers;

public static class InMemoryDbFactory
{
    public static DataContext Create(string? dbName = null)
    {
        var name = dbName ?? Guid.NewGuid().ToString();

        var options = new DbContextOptionsBuilder<DataContext>()
            .UseInMemoryDatabase(databaseName: name)
            .Options;

        var context = new DataContext(options);

        context.Database.EnsureCreated();

        return context;
    }
}