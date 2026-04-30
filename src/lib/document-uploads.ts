export interface UploadedDocument {
  url: string;
  name: string;
}

export interface UploadGuidanceSection {
  title?: string;
  items: string[];
}

export interface UploadGuidance {
  title?: string;
  description?: string;
  sections: UploadGuidanceSection[];
}

export const ACCEPTED_DOCUMENT_EXTENSIONS = [".pdf", ".xls", ".xlsx"] as const;
export const DEFAULT_DOCUMENT_ACCEPT = ACCEPTED_DOCUMENT_EXTENSIONS.join(",");
export const DEFAULT_DOCUMENT_LABEL = "PDF, XLS, or XLSX";
export const CLOUDINARY_PRIVATE_REFERENCE_PREFIX = "cld:private:";

const ACCEPTED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

export function getFileExtension(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot < 0) return "";
  return fileName.slice(lastDot).toLowerCase();
}

export function getFileBaseName(fileName: string) {
  const extension = getFileExtension(fileName);
  return extension ? fileName.slice(0, -extension.length) : fileName;
}

export function isAcceptedDocumentFile(file: Pick<File, "name" | "type">) {
  const extension = getFileExtension(file.name);
  return ACCEPTED_DOCUMENT_EXTENSIONS.includes(extension as (typeof ACCEPTED_DOCUMENT_EXTENSIONS)[number]) ||
    ACCEPTED_DOCUMENT_MIME_TYPES.has(file.type);
}

export function isCloudinaryDocumentUrl(url: string) {
  return isCloudinaryPrivateReference(url) || /(^https?:\/\/)?res\.cloudinary\.com\//i.test(url);
}

export function createCloudinaryPrivateReference(publicId: string) {
  return `${CLOUDINARY_PRIVATE_REFERENCE_PREFIX}${publicId}`;
}

export function isCloudinaryPrivateReference(url: string) {
  return url.startsWith(CLOUDINARY_PRIVATE_REFERENCE_PREFIX);
}

export function getCloudinaryPublicId(value: string) {
  return isCloudinaryPrivateReference(value)
    ? value.slice(CLOUDINARY_PRIVATE_REFERENCE_PREFIX.length)
    : value;
}

export function getDocumentTypeLabel(fileName: string) {
  const extension = getFileExtension(fileName);
  if (extension === ".xls" || extension === ".xlsx") return "Excel";
  return "PDF";
}

export function createProjectRegistrationGuidance(isExternallyFunded: boolean): UploadGuidance {
  return {
    title: "Project registration upload guide",
    description: "Prepare the required supporting files as PDF or Excel before submitting this registration.",
    sections: [
      {
        title: "Active partnership",
        items: [
          "For new partnership: notarized copy of the MOA, MOU, LOA, or agreement letter.",
          "For new partnership: copy of the approved extension program or project proposal.",
          "For existing partnership: highlights and photo documentation of activities related to the partnership.",
        ],
      },
      {
        title: isExternallyFunded ? "Externally funded project" : "Internally funded project",
        items: [
          "Minutes, attendance, and photo documentation for presenting the benchmark survey or CNA results to stakeholders.",
          "Minutes, attendance, and photo documentation for presenting the validated benchmark survey or CNA to the college academic or unit council.",
          "Copy of the approved extension program or project proposal, including the work plan and budgetary requirement.",
          "Copy of the BOR or President approval for the program or project.",
          "Copy of the approved recommendation and special order of the project team.",
        ],
      },
      {
        title: "Needs assessment",
        items: [
          "Copy of the benchmark survey or CNA results that were presented and validated.",
        ],
      },
    ],
  };
}

export const DOCUMENT_UPLOAD_GUIDANCE = {
  consultancy: {
    title: "Consultancy upload guide",
    description: "Upload the consultancy supporting records in PDF or Excel format.",
    sections: [
      {
        items: [
          "Copy of the approved consultancy program or project and other supporting documents.",
          "MOA, MOU, or LOA when applicable.",
        ],
      },
    ],
  } satisfies UploadGuidance,
  trainings: {
    title: "Training upload guide",
    description: "Upload the EXTN-QF-11 training, seminar, or webinar report set as PDF or Excel files.",
    sections: [
      {
        items: [
          "Approved proposal.",
          "Official program.",
          "Highlights of the activity with captioned photos.",
          "Copy of the attendance sheet.",
          "At least two accomplished activity evaluation samples.",
        ],
      },
    ],
  } satisfies UploadGuidance,
  technicalAdvisory: {
    title: "Technical advisory upload guide",
    description: "Upload the accomplished evaluation and supporting documentation as PDF or Excel files.",
    sections: [
      {
        items: [
          "Accomplished Technical Advisory Services Evaluation Form (EXTN-QF-21).",
          "Photo documentation with caption.",
        ],
      },
    ],
  } satisfies UploadGuidance,
  adopters: {
    title: "Adopters upload guide",
    description: "Upload the adopter support files as PDF or Excel records.",
    sections: [
      {
        items: [
          "Photo documentation of attendance to trainings and other University activities.",
          "Documented success story such as a brochure or equivalent written evidence.",
        ],
      },
    ],
  } satisfies UploadGuidance,
  iec: {
    title: "IEC upload guide",
    description: "Upload the developed IEC files and distribution proof as PDF or Excel.",
    sections: [
      {
        items: [
          "Copy of the IEC materials developed.",
          "Supporting document showing the number of clients who received the IEC materials.",
        ],
      },
    ],
  } satisfies UploadGuidance,
  budgetUtilization: {
    title: "Budget utilization upload guide",
    description: "Upload the signed utilization files as PDF or Excel.",
    sections: [
      {
        items: [
          "Budget utilization report signed by the Budget Officer and Dean, Campus Administrator, or Director.",
          "Itemized budget utilization report signed by the Budget Officer and Dean, Campus Administrator, or Director.",
        ],
      },
    ],
  } satisfies UploadGuidance,
  extensionPpa: {
    title: "Extension PPA upload guide",
    description: "Upload the feature or publicity evidence as PDF or Excel.",
    sections: [
      {
        items: [
          "Copy of evidence showing the Extension PPA was featured, such as Ugnayan, Reconnections, Facebook page, college or campus newsletter, or equivalent.",
        ],
      },
    ],
  } satisfies UploadGuidance,
  technologies: {
    title: "Technology and innovation upload guide",
    description: "Upload the technology support files as PDF or Excel.",
    sections: [
      {
        items: [
          "Photo and IEC material about the technology.",
          "Documentation of deployment, commercialization, and pre-commercialization activities.",
        ],
      },
    ],
  } satisfies UploadGuidance,
  ordinance: {
    title: "Ordinance or resolution upload guide",
    description: "Upload the ordinance or resolution document as PDF or Excel.",
    sections: [
      {
        items: [
          "Copy of the approved, endorsed, or proposed resolution.",
        ],
      },
    ],
  } satisfies UploadGuidance,
  impactAssessment: {
    title: "Impact assessment upload guide",
    description: "Upload the impact assessment report as PDF or Excel.",
    sections: [
      {
        items: [
          "Copy of the impact assessment report.",
        ],
      },
    ],
  } satisfies UploadGuidance,
  awards: {
    title: "Awards upload guide",
    description: "Upload the proof of award or recognition as PDF or Excel.",
    sections: [
      {
        items: [
          "Copy of the certificate or plaque.",
        ],
      },
    ],
  } satisfies UploadGuidance,
  otherActivities: {
    title: "Other activities upload guide",
    description: "Upload the activity support files as PDF or Excel.",
    sections: [
      {
        items: [
          "Approved proposal.",
          "Memo or invitation letter when applicable.",
          "Highlights or report of the activity including captioned photos.",
          "Copy of attendance sheets.",
        ],
      },
    ],
  } satisfies UploadGuidance,
  needsAssessment: {
    title: "Needs assessment upload guide",
    description: "Upload the presented and validated results as a PDF or Excel file.",
    sections: [
      {
        items: [
          "Copy of the benchmark survey or CNA results that were presented and validated.",
        ],
      },
    ],
  } satisfies UploadGuidance,
} as const;
