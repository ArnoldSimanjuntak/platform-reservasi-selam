export type ProviderPrimaryType = "boat" | "instructor" | "gear";
export type InstructorScope = "guide" | "instructor";

export type VerificationDocumentType =
    | "identity_card"
    | "business_license"
    | "vessel_document"
    | "life_jacket_photo"
    | "first_aid_photo"
    | "lifebuoy_photo"
    | "fire_extinguisher_photo"
    | "gear_inventory_photo"
    | "gear_maintenance_document"
    | "dive_certificate";

export interface ProviderVerificationDocument {
    id?: string;
    provider_id?: string;
    document_type: VerificationDocumentType | string;
    label?: string | null;
    storage_path?: string | null;
    public_url?: string | null;
    signed_url?: string | null;
    is_required?: boolean | null;
    status?: string | null;
    notes?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface ProviderVerificationProfile {
    primary_type?: string | null;
    instructor_scope?: string | null;
    identity_card_url?: string | null;
    certification_url?: string | null;
    verification_documents?: ProviderVerificationDocument[] | null;
}

export interface VerificationDocumentDefinition {
    type: VerificationDocumentType;
    label: string;
    helper: string;
    required: boolean;
}

const DEFINITIONS: Record<VerificationDocumentType, Omit<VerificationDocumentDefinition, "type">> = {
    identity_card: {
        label: "KTP / Identitas pemilik",
        helper: "Identitas penanggung jawab usaha provider.",
        required: true,
    },
    business_license: {
        label: "NIB / izin usaha",
        helper: "Bukti legalitas usaha atau perizinan berusaha.",
        required: true,
    },
    vessel_document: {
        label: "Dokumen kapal / operasional",
        helper: "Contoh: Pas Kecil, Sertifikat Keselamatan Kapal, SLO, atau dokumen operasional setara.",
        required: true,
    },
    life_jacket_photo: {
        label: "Foto life jacket",
        helper: "Bukti ketersediaan jaket pelampung untuk penumpang.",
        required: true,
    },
    first_aid_photo: {
        label: "Foto P3K / oksigen",
        helper: "Bukti perlengkapan pertolongan pertama dan dukungan keadaan darurat.",
        required: true,
    },
    lifebuoy_photo: {
        label: "Foto pelampung",
        helper: "Bukti pelampung penolong atau surface marker yang berfungsi.",
        required: true,
    },
    fire_extinguisher_photo: {
        label: "Foto APAR",
        helper: "Bukti alat pemadam api ringan tersedia dan layak pakai.",
        required: true,
    },
    gear_inventory_photo: {
        label: "Foto / inventaris alat",
        helper: "Bukti stok dan kondisi peralatan selam yang disewakan.",
        required: true,
    },
    gear_maintenance_document: {
        label: "Catatan perawatan tabung / kompresor",
        helper: "Opsional pada v1, tetapi membantu admin menilai kelayakan alat.",
        required: false,
    },
    dive_certificate: {
        label: "Sertifikat selam",
        helper: "Guide minimal Rescue Diver/setara; instruktur course wajib instructor-level atau setara.",
        required: true,
    },
};

export function getDocumentDefinition(type: string): VerificationDocumentDefinition {
    const definition = DEFINITIONS[type as VerificationDocumentType];
    if (!definition) {
        return {
            type: type as VerificationDocumentType,
            label: type.replace(/_/g, " "),
            helper: "Dokumen pendukung verifikasi.",
            required: false,
        };
    }

    return { type: type as VerificationDocumentType, ...definition };
}

export function getRequiredDocumentTypes(
    primaryType?: string | null,
    instructorScope?: string | null
): VerificationDocumentType[] {
    const common: VerificationDocumentType[] = ["identity_card", "business_license"];

    if (primaryType === "boat") {
        return [
            ...common,
            "vessel_document",
            "life_jacket_photo",
            "first_aid_photo",
            "lifebuoy_photo",
            "fire_extinguisher_photo",
        ];
    }

    if (primaryType === "gear") {
        return [...common, "gear_inventory_photo"];
    }

    if (primaryType === "instructor") {
        return [...common, "dive_certificate"];
    }

    return common;
}

export function getOptionalDocumentTypes(primaryType?: string | null): VerificationDocumentType[] {
    if (primaryType === "gear") return ["gear_maintenance_document"];
    return [];
}

export function getDocumentTypesForProvider(
    primaryType?: string | null,
    instructorScope?: string | null
): VerificationDocumentType[] {
    return [
        ...getRequiredDocumentTypes(primaryType, instructorScope),
        ...getOptionalDocumentTypes(primaryType),
    ];
}

export function documentHasFile(document?: ProviderVerificationDocument | null) {
    return !!(document?.signed_url || document?.storage_path || document?.public_url);
}

export function getSubmittedDocumentTypes(profile: ProviderVerificationProfile) {
    const submitted = new Set<string>();

    for (const document of profile.verification_documents ?? []) {
        if (documentHasFile(document)) submitted.add(document.document_type);
    }

    if (profile.identity_card_url) submitted.add("identity_card");
    if (profile.certification_url) submitted.add("dive_certificate");

    return submitted;
}

export function getMissingRequiredDocumentTypes(profile: ProviderVerificationProfile) {
    const submitted = getSubmittedDocumentTypes(profile);
    return getRequiredDocumentTypes(profile.primary_type, profile.instructor_scope).filter(
        (type) => !submitted.has(type)
    );
}

export function getInstructorScopeLabel(scope?: string | null) {
    if (scope === "instructor") return "Instruktur Course";
    return "Guide / Pendamping";
}
