import fs from "node:fs";
import path from "node:path";

const entities = [
    {
        id: "users",
        title: "USERS",
        x: 20,
        y: 120,
        width: 240,
        fields: [
            ["uuid", "id", "PK"],
            ["varchar", "name", ""],
            ["varchar", "email", "UK"],
            ["varchar", "role", ""],
            ["boolean", "wants_provider", ""],
            ["timestamptz", "created_at", ""],
            ["timestamptz", "updated_at", ""],
        ],
    },
    {
        id: "providers",
        title: "PROVIDERS",
        x: 330,
        y: 40,
        width: 330,
        fields: [
            ["uuid", "id", "PK"],
            ["uuid", "owner_user_id", "FK, UK"],
            ["varchar", "name", ""],
            ["text", "location", ""],
            ["varchar", "contact", ""],
            ["text", "description", ""],
            ["varchar", "primary_type", ""],
            ["varchar", "instructor_scope", ""],
            ["text", "business_license_number", ""],
            ["varchar", "verification_status", ""],
            ["boolean", "is_active", ""],
            ["text", "rejection_reason", ""],
            ["double", "latitude", ""],
            ["double", "longitude", ""],
            ["timestamptz", "verification_submitted_at", ""],
            ["timestamptz", "verified_at", ""],
            ["timestamptz", "created_at", ""],
            ["timestamptz", "updated_at", ""],
        ],
    },
    {
        id: "provider_verification_documents",
        title: "PROVIDER_VERIFICATION_DOCUMENTS",
        x: 20,
        y: 680,
        width: 280,
        fields: [
            ["uuid", "id", "PK"],
            ["uuid", "provider_id", "FK"],
            ["varchar", "document_type", ""],
            ["text", "label", ""],
            ["text", "storage_path", ""],
            ["text", "public_url", ""],
            ["boolean", "is_required", ""],
            ["varchar", "status", ""],
            ["text", "notes", ""],
            ["timestamptz", "created_at", ""],
            ["timestamptz", "updated_at", ""],
        ],
    },
    {
        id: "services",
        title: "SERVICES",
        x: 350,
        y: 700,
        width: 270,
        fields: [
            ["uuid", "id", "PK"],
            ["uuid", "provider_id", "FK"],
            ["varchar", "name", ""],
            ["text", "description", ""],
            ["varchar", "type", ""],
            ["decimal", "price", ""],
            ["integer", "max_capacity", ""],
            ["varchar", "dive_site_category", ""],
            ["text", "image_url", ""],
            ["boolean", "is_available", ""],
            ["timestamptz", "created_at", ""],
            ["timestamptz", "updated_at", ""],
        ],
    },
    {
        id: "dive_sites",
        title: "DIVE_SITES",
        x: 760,
        y: 360,
        width: 275,
        fields: [
            ["uuid", "id", "PK"],
            ["varchar", "name", ""],
            ["integer", "zone_level", ""],
            ["integer", "surcharge_fee", ""],
            ["text", "description", ""],
            ["double", "latitude", ""],
            ["double", "longitude", ""],
            ["text", "image_url", ""],
            ["boolean", "is_active", ""],
            ["integer", "kedalaman_meter", ""],
            ["integer", "waktu_tempuh_kapal_menit", ""],
            ["varchar", "habitat", ""],
            ["timestamptz", "created_at", ""],
            ["timestamptz", "updated_at", ""],
        ],
    },
    {
        id: "bookings",
        title: "BOOKINGS",
        x: 430,
        y: 1080,
        width: 310,
        fields: [
            ["uuid", "id", "PK"],
            ["uuid", "user_id", "FK"],
            ["uuid", "service_id", "FK"],
            ["uuid", "provider_id", "FK"],
            ["uuid", "dive_site_id", "FK"],
            ["date", "booking_date", ""],
            ["integer", "total_participants", ""],
            ["integer", "rental_days", ""],
            ["varchar", "status", ""],
            ["decimal", "total_price", ""],
            ["varchar", "payment_status", ""],
            ["timestamptz", "payment_deadline", ""],
            ["text", "payment_proof_url", ""],
            ["text", "notes", ""],
            ["timestamptz", "created_at", ""],
            ["timestamptz", "updated_at", ""],
        ],
    },
];

const relations = [
    {
        id: "rel_users_providers",
        source: "users",
        target: "providers",
        label: "memiliki profil provider",
        startArrow: "ERone",
        endArrow: "ERzeroToOne",
        style: "exitX=1;exitY=0.45;entryX=0;entryY=0.22;",
    },
    {
        id: "rel_users_bookings",
        source: "users",
        target: "bookings",
        label: "membuat",
        startArrow: "ERone",
        endArrow: "ERzeroToMany",
        style: "exitX=0;exitY=0.82;entryX=0;entryY=0.12;",
        points: [[5, 1015], [400, 1015]],
    },
    {
        id: "rel_provider_documents",
        source: "providers",
        target: "provider_verification_documents",
        label: "mengunggah",
        startArrow: "ERone",
        endArrow: "ERzeroToMany",
        style: "exitX=0.2;exitY=1;entryX=0.85;entryY=0;",
    },
    {
        id: "rel_provider_services",
        source: "providers",
        target: "services",
        label: "menyediakan",
        startArrow: "ERone",
        endArrow: "ERzeroToMany",
        style: "exitX=0.52;exitY=1;entryX=0.48;entryY=0;",
    },
    {
        id: "rel_provider_bookings",
        source: "providers",
        target: "bookings",
        label: "menerima",
        startArrow: "ERone",
        endArrow: "ERzeroToMany",
        style: "exitX=0.9;exitY=1;entryX=0.83;entryY=0;",
        points: [[700, 650], [700, 1035]],
    },
    {
        id: "rel_services_bookings",
        source: "services",
        target: "bookings",
        label: "dipesan melalui",
        startArrow: "ERone",
        endArrow: "ERzeroToMany",
        style: "exitX=0.52;exitY=1;entryX=0.38;entryY=0;",
    },
    {
        id: "rel_dive_sites_bookings",
        source: "dive_sites",
        target: "bookings",
        label: "dipilih pada booking kapal",
        startArrow: "ERzeroToOne",
        endArrow: "ERzeroToMany",
        style: "exitX=0.1;exitY=1;entryX=1;entryY=0.2;",
        points: [[790, 1030], [760, 1030]],
    },
];

function escapeXml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function tableHtml(entity) {
    const rows = entity.fields
        .map(
            ([type, name, key]) =>
                `<tr>` +
                `<td style="border-top:1px solid #666;border-right:1px solid #666;padding:4px 5px;width:34%;">${type}</td>` +
                `<td style="border-top:1px solid #666;border-right:1px solid #666;padding:4px 5px;width:51%;">${name}</td>` +
                `<td style="border-top:1px solid #666;padding:4px 5px;text-align:center;width:15%;font-weight:600;">${key}</td>` +
                `</tr>`
        )
        .join("");

    return (
        `<div style="font-family:Arial;font-size:11px;color:#111;">` +
        `<div style="font-weight:700;text-align:center;padding:7px 3px;">${entity.title}</div>` +
        `<table style="border-collapse:collapse;width:100%;table-layout:fixed;">${rows}</table>` +
        `</div>`
    );
}

function entityCell(entity) {
    const height = 30 + entity.fields.length * 25;
    return `    <mxCell id="${entity.id}" value="${escapeXml(tableHtml(entity))}" style="rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacing=0;overflow=fill;strokeColor=#333333;strokeWidth=1;fillColor=#ffffff;fontColor=#111111;" vertex="1" parent="1">\n      <mxGeometry x="${entity.x}" y="${entity.y}" width="${entity.width}" height="${height}" as="geometry"/>\n    </mxCell>`;
}

function relationCell(relation) {
    const points = relation.points?.length
        ? `\n      <mxGeometry relative="1" as="geometry">\n        <Array as="points">${relation.points
              .map(([x, y]) => `\n          <mxPoint x="${x}" y="${y}"/>`)
              .join("")}\n        </Array>\n      </mxGeometry>`
        : `\n      <mxGeometry relative="1" as="geometry"/>`;

    const style =
        `edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;` +
        `strokeColor=#333333;strokeWidth=1;startArrow=${relation.startArrow};startFill=0;` +
        `endArrow=${relation.endArrow};endFill=0;fontSize=10;labelBackgroundColor=#ffffff;` +
        relation.style;

    return `    <mxCell id="${relation.id}" value="${escapeXml(relation.label)}" style="${style}" edge="1" parent="1" source="${relation.source}" target="${relation.target}">${points}\n    </mxCell>`;
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" agent="Codex" version="26.0.4">
  <diagram id="sulutdive-erd" name="ERD SulutDive">
    <mxGraphModel dx="1200" dy="1600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="1654" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
${entities.map(entityCell).join("\n")}
${relations.map(relationCell).join("\n")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;

const outputPath = path.resolve("docs", "erd-sulutdive-crows-foot-tanpa-auth-users.drawio");
fs.writeFileSync(outputPath, xml, "utf8");
console.log(outputPath);
