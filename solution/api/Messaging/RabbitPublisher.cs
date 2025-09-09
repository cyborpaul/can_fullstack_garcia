using System.Text;
using System.Text.Json;
using RabbitMQ.Client;

namespace Sgcan.Api.Messaging;

public class RabbitPublisher : IDisposable
{
    private readonly IConnection _conn;
    private readonly IModel _ch;
    private readonly string _queue;

    public RabbitPublisher(IConfiguration cfg)
    {
        var url = cfg["BROKER_URL"] ?? "amqp://guest:guest@broker:5672";
        _queue = cfg["QUEUE_EXTRACT"] ?? "sgcan.documents.extract";

        var factory = new ConnectionFactory { Uri = new Uri(url) };
        _conn = factory.CreateConnection("api-publisher");
        _ch = _conn.CreateModel();
        _ch.QueueDeclare(queue: _queue, durable: true, exclusive: false, autoDelete: false, arguments: null);
        _ch.BasicQos(0, 1, false);
    }

    public void Publish<T>(T message)
    {
        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(message));
        var props = _ch.CreateBasicProperties();
        props.DeliveryMode = 2;

        _ch.BasicPublish(exchange: "", routingKey: _queue, basicProperties: props, body: body);
    }

    public void Dispose()
    {
        try { _ch?.Close(); } catch { }
        try { _conn?.Close(); } catch { }
        _ch?.Dispose();
        _conn?.Dispose();
    }
}
