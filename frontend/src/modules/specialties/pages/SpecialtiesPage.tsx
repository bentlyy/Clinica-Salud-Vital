import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button } from '@mui/material';
import Add from '@mui/icons-material/Add';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Pagination } from '@/shared/components/ui/Pagination';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { useAuth } from '@/shared/providers/AuthProvider';
import { superAdminService } from '@/modules/super-admin/services/super-admin.service';
import type { Tenant } from '@/modules/super-admin/types/super-admin.types';
import {
  useSpecialtyList,
  useCreateSpecialty,
  useUpdateSpecialty,
  useDeleteSpecialty,
} from '../hooks/useSpecialties';
import type { Specialty, CreateSpecialtyInput, UpdateSpecialtyInput } from '../types/specialty.types';
import { SpecialtyStatsCards } from '../components/SpecialtyStatsCards';
import { SpecialtyFilters } from '../components/SpecialtyFilters';
import { SpecialtyRow } from '../components/SpecialtyRow';
import { SpecialtyFormModal } from '../components/SpecialtyFormModal';
import { DeleteSpecialtyDialog } from '../components/DeleteSpecialtyDialog';
import { EmptySpecialties } from '../components/EmptySpecialties';
import { LoadingSpecialties } from '../components/LoadingSpecialties';

const PAGE_SIZE = 10;

export default function SpecialtiesPage() {
  const { t } = useTranslation('specialties');
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [clinicFilter, setClinicFilter] = useState('');
  const [clinics, setClinics] = useState<Tenant[]>([]);
  const [editing, setEditing] = useState<Specialty | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<Specialty | null>(null);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let active = true;
    superAdminService
      .listTenants({ page: 1, limit: 200 })
      .then((res) => {
        if (active) setClinics(res.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isSuperAdmin]);

  const listParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      tenantId: isSuperAdmin ? clinicFilter || undefined : undefined,
    }),
    [page, search, clinicFilter, isSuperAdmin],
  );

  const { data, isLoading, error, refetch } = useSpecialtyList(listParams);

  const createSpecialty = useCreateSpecialty();
  const updateSpecialty = useUpdateSpecialty();
  const deleteSpecialty = useDeleteSpecialty();

  const specialties = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(total / PAGE_SIZE));

  const clinicNameById = useMemo(
    () => new Map(clinics.map((c) => [String(c.id), c.name])),
    [clinics],
  );

  const openCreate = useCallback(() => {
    setEditing(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((spec: Specialty) => {
    setEditing(spec);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    if (createSpecialty.isPending || updateSpecialty.isPending) return;
    setModalOpen(false);
    setEditing(null);
  }, [createSpecialty.isPending, updateSpecialty.isPending]);

  const handleCreate = useCallback(
    (input: CreateSpecialtyInput & { tenantId?: string }) => {
      createSpecialty.mutate(
        { ...input, tenantId: input.tenantId ?? (isSuperAdmin ? clinicFilter || undefined : undefined) },
        { onSuccess: () => { setModalOpen(false); setEditing(null); } },
      );
    },
    [createSpecialty, isSuperAdmin, clinicFilter],
  );

  const handleUpdate = useCallback(
    (input: CreateSpecialtyInput & { tenantId?: string }) => {
      if (!editing) return;
      const payload: UpdateSpecialtyInput & { tenantId?: string } = { ...input, tenantId: input.tenantId };
      updateSpecialty.mutate(
        { id: editing.id, input: payload },
        { onSuccess: () => { setModalOpen(false); setEditing(null); } },
      );
    },
    [updateSpecialty, editing],
  );

  const handleDelete = useCallback(() => {
    if (!deleting) return;
    deleteSpecialty.mutate(deleting.id, {
      onSuccess: () => setDeleting(null),
    });
  }, [deleteSpecialty, deleting]);

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle', { total })}
        action={
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            {t('newSpecialty')}
          </Button>
        }
      />

      {!isLoading && specialties.length > 0 && (
        <SpecialtyStatsCards specialties={specialties} isSuperAdmin={isSuperAdmin} clinicCount={clinics.length} />
      )}

      <SpecialtyFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        clinicFilter={clinicFilter}
        onClinicFilterChange={(v) => { setClinicFilter(v); setPage(1); }}
        clinics={clinics}
        isSuperAdmin={isSuperAdmin}
      />

      {isLoading ? (
        <LoadingSpecialties />
      ) : error ? (
        <ErrorState error={error as never} onRetry={refetch} />
      ) : specialties.length === 0 ? (
        <EmptySpecialties hasSearch={!!search} onCreate={openCreate} />
      ) : (
        <Box>
          {specialties.map((spec) => (
            <SpecialtyRow
              key={spec.id}
              specialty={spec}
              clinicName={isSuperAdmin ? clinicNameById.get(String(spec.tenant_id)) : undefined}
              isSuperAdmin={isSuperAdmin}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          ))}
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
        </Box>
      )}

      <SpecialtyFormModal
        open={modalOpen}
        editing={editing}
        clinics={clinics}
        isSuperAdmin={isSuperAdmin}
        defaultTenantId={clinicFilter}
        isPending={createSpecialty.isPending || updateSpecialty.isPending}
        onClose={handleModalClose}
        onSubmit={editing ? handleUpdate : handleCreate}
      />

      <DeleteSpecialtyDialog
        specialty={deleting}
        isPending={deleteSpecialty.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </MotionDiv>
  );
}
