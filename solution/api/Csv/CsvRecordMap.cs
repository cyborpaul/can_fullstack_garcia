using CsvHelper.Configuration;

namespace Sgcan.Api.Csv;

public sealed class CsvRecordMap : ClassMap<CsvRecord>
{
    public CsvRecordMap()
    {
        Map(m => m.Nomenclatura).Name(
            "Nomenclatura"
        );

        Map(m => m.Titulo).Name(
            "Título", "Titulo"
        );

        Map(m => m.FechaPublicacion).Name(
            "Fecha de publicación", "Fecha de publicacion",
            "Fecha_de_publicación", "Fecha_de_publicacion", "Fecha_de_publicación_"
        );

        Map(m => m.Documento).Name(
            "Documento"
        );

        Map(m => m.UrlDocumento).Name(
            "URL Documento", "Url Documento",
            "URL_Documento", "Url_Documento"
        );

        Map(m => m.Paginas).Name(
            "Cantidad de páginas", "Cantidad de paginas",
            "Cantidad_de_páginas", "Cantidad_de_paginas"
        );

        Map(m => m.TipoDocumento).Name(
            "Tipo documento", "Tipo_documento"
        );
    }
}
