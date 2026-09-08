export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface Source extends BaseEntity {
  title: string;
  type: 'book' | 'journal' | 'archive' | 'newspaper' | 'website' | 'oral' | 'other';
  author: string;
  publisher: string;
  publishDate: string;
  url: string;
  fileUrl: string;
  description: string;
  category: string;
  credibilityLevel: 'A' | 'B' | 'C';
  fileType?: 'image' | 'localGazetteer' | 'bookOrJournal' | 'document' | string;
  fileName?: string;
  fileSize?: number;
  fileExt?: string;
  mimeType?: string;
  sourceFileKind?: 'pdf' | 'txt' | 'md' | 'docx' | 'doc' | 'xlsx' | 'csv' | 'image' | 'model' | 'audio' | 'video' | 'other' | string;
  aiReadable?: boolean;
  extractStatus?: 'pending' | 'success' | 'failed' | 'unsupported';
  extractError?: string;
  textPath?: string;
  textCharCount?: number;
  summaryStatus?: 'pending' | 'success' | 'failed' | 'unsupported';
  aiSummary?: string;
  summaryUpdatedAt?: string;
  importedBy?: string;
  importedAt?: string;
  importedOriginalPath?: string;
  contentHash?: string;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  reviewConfidence?: number;
  reviewReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  relatedSources?: string[];
}

export interface SourceSubmission extends BaseEntity {
  name: string;
  contact: string;
  title: string;
  content: string;
  source: string;
  fileUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  convertedSourceId?: string;
  aiReviewStatus?: 'pending' | 'success' | 'failed';
  aiReviewSummary?: string;
  aiKeywords?: string[];
  aiEntities?: string[];
  confidenceScore?: number;
  isCredible?: boolean;
  doubts?: string[];
  errorPositions?: string[];
  aiReviewUpdatedAt?: string;
}

export interface AiToken extends BaseEntity {
  targetType: 'source' | 'submission' | 'person' | 'site' | 'fact' | 'search' | 'admin' | string;
  targetId: string;
  summary: string;
  keywords: string[];
  entities: string[];
  tags: string[];
  traits: string[];
  category: string;
  confidenceScore?: number;
  isCredible?: boolean;
  doubts: string[];
  errorPositions: string[];
  relatedTargetIds: string[];
  sourceIds: string[];
  status: 'active' | 'pending' | 'failed' | 'archived';
  summaryQuality?: 'full' | 'partial' | 'pending';
  manualOverride: boolean;
  modelProvider: 'local' | 'cloud' | 'none' | string;
  modelName: string;
  rawResult?: Record<string, unknown>;
}

export interface HeritageSite extends BaseEntity {
  name: string;
  slug: string;
  industry: 'textile' | 'machinery' | 'food' | 'chemical' | 'printing' | 'building' | 'transport' | 'other';
  description: string;
  historicalValue: string;
  location: string;
  longitude?: number;
  latitude?: number;
  establishedYear: number;
  closedYear?: number;
  status: 'active' | 'inactive' | 'demolished' | 'protected';
  coverImage: string;
  images: string[];
  representativePeople: string[];
  relatedFacts: string[];
  sourceIds: string[];
  isPublished: boolean;
  isRecommended: boolean;
}

export interface Person extends BaseEntity {
  name: string;
  title: string;
  role?: string;
  entityType?: 'person' | 'organization' | 'unknown';
  birthYear?: number;
  deathYear?: number;
  biography: string;
  achievements: string;
  portrait: string;
  avatar?: string;
  bgImage?: string;
  relatedSiteId?: string;
  relatedSiteName?: string;
  siteIds: string[];
  factIds: string[];
  sourceIds: string[];
  verifiedStatus?: 'unverified' | 'verified';
  verifiedBy?: string;
  verifiedAt?: string;
  pinned?: boolean;
}

export interface FactClaim extends BaseEntity {
  title: string;
  claimText: string;
  publicExpression: string;
  riskWords: string[];
  riskLevel: 'high' | 'medium' | 'low';
  reviewStatus: 'pending' | 'approved' | 'rejected';
  isPublished: boolean;
  siteIds: string[];
  personIds: string[];
  sourceIds: string[];
  category: string;
}

export interface SourceLink extends BaseEntity {
  sourceId: string;
  targetId: string;
  relationType: 'cites' | 'supports' | 'contradicts' | 'extends' | 'related';
  confidence: number;
  aiReason: string;
  isApproved: boolean;
  isEdited: boolean;
  editorNote?: string;
}

export interface TimelineEvent extends BaseEntity {
  year: number;
  month?: number;
  day?: number;
  title: string;
  description: string;
  category: string;
  importance?: 1 | 2 | 3 | 4 | 5;
  image?: string;
  siteIds?: string[];
  sourceIds?: string[];
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  isPublished?: boolean;
  generatedByAI?: boolean;
  aiRationale?: string;
}

export interface MapPoint extends BaseEntity {
  name: string;
  slug: string;
  description: string;
  xPercent: number;
  yPercent: number;
  longitude?: number;
  latitude?: number;
  siteId?: string;
  status: string;
  baseMapImage?: string;
}

export interface SceneHotspot {
  id: string;
  label: string;
  description: string;
  xPercent: number;
  yPercent: number;
  linkUrl?: string;
}

export interface DigitalScene extends BaseEntity {
  title: string;
  description: string;
  image: string;
  modelUrl?: string;
  modelType?: 'gltf' | 'obj' | 'fbx' | 'other';
  hotspots: SceneHotspot[];
  siteId?: string;
}

export interface Course extends BaseEntity {
  title: string;
  description: string;
  type: string;
  targetAudience: string;
  pptFile: string;
  scriptFile: string;
  taskFile: string;
  keywords?: string[];
  relatedFactIds: string[];
  isPublished: boolean;
}

export interface Activity extends BaseEntity {
  title: string;
  description: string;
  date: string;
  location: string;
  servedCount: number;
  feedback: string;
  photos: string;
  isPublished: boolean;
}

export interface MediaFile extends BaseEntity {
  originalName: string;
  fileName: string;
  url: string;
  type: 'image' | 'document' | 'course' | 'scene';
  size: number;
  mimeType: string;
  category?: 'historical' | 'web';
}

export interface Settings extends BaseEntity {
  siteTitle: string;
  siteDescription: string;
  projectIntro: string;
  contactInfo: string;
  footerText: string;
  mapBaseImage?: string;
  heroImageUrl?: string;
  aiEnabled?: boolean;
  aiBaseUrl?: string;
  aiApiKey?: string;
  aiModel?: string;
  aiTimeoutMs?: number;
  aiTemperature?: number;
  cloudAiEnabled?: boolean;
  cloudAiBaseUrl?: string;
  cloudAiApiKey?: string;
  cloudAiModel?: string;
  cloudAiProtocol?: 'claude' | string;
  sourceImportDir?: string;
  adminUsername?: string;
  adminPassword?: string;
  adminRegistrationKey?: string;
  adminName?: string;
  adminGender?: 'male' | 'female' | 'other';
  adminPhone?: string;
  adminEmail?: string;
}

export interface UserAccount extends BaseEntity {
  username: string;
  passwordHash: string;
  passwordSalt: string;
  role: 'user' | 'admin';
  name: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  email: string;
  status: 'active' | 'disabled';
}
