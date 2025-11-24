export interface OrganizationEvent {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  environmentIds: string[];
  startDate: string | null;
  endDate: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CreateOrganizationEventInput {
  organizationId: string;
  name: string;
  description?: string;
  environmentIds?: string[];
  startDate?: string | null;
  endDate?: string | null;
}

export type UpdateOrganizationEventInput = Partial<
  Omit<OrganizationEvent, 'id' | 'organizationId'>
>;
