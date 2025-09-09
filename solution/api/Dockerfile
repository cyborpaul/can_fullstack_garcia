FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY Sgcan.Api.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:9010
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "Sgcan.Api.dll"]
