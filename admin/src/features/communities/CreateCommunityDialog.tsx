import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { WarningCircle } from '@phosphor-icons/react';
import { errorMessage } from '../../api/errors.ts';
import {
  COMMUNITY_TYPES,
  COMMUNITY_TYPE_LABELS,
  type CommunityType,
  type CreateCommunityPayload,
} from '../../api/types.ts';
import { userKeys, usersApi } from '../users/users.api.ts';
import { communitiesApi } from './communities.api.ts';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Select } from '../../components/ui/select.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog.tsx';

interface CreateCommunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

/** Only unassigned leaders are offered; the server rejects the rest anyway. */
const LEADER_PAGE_SIZE = 100;

/**
 * Split out of the page so its form state is created and destroyed with the
 * dialog — leaving a half-filled form in the page's state means reopening it
 * shows yesterday's draft.
 */
export function CreateCommunityDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateCommunityDialogProps): React.JSX.Element {
  const [name, setName] = useState('');
  const [type, setType] = useState<CommunityType>('SAMAJ');
  const [description, setDescription] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetched only while the dialog is open: a leader list is useless to a closed
  // dialog and this page is opened far more often than a community is created.
  const leadersQuery = useQuery({
    queryKey: userKeys.list({ role: 'LEADER', status: 'ACTIVE', pageSize: LEADER_PAGE_SIZE }),
    queryFn: () => usersApi.list({ role: 'LEADER', status: 'ACTIVE', pageSize: LEADER_PAGE_SIZE }),
    enabled: open,
  });

  const leaders = useMemo(() => leadersQuery.data?.items ?? [], [leadersQuery.data]);

  const reset = (): void => {
    setName('');
    setType('SAMAJ');
    setDescription('');
    setLeaderId('');
    setState('');
    setDistrict('');
    setCity('');
    setPincode('');
    setContactEmail('');
    setContactPhone('');
    setError(null);
  };

  const mutation = useMutation({
    mutationFn: (payload: CreateCommunityPayload) => communitiesApi.create(payload),
    onSuccess: () => {
      reset();
      onCreated();
      onOpenChange(false);
    },
    onError: (caught: unknown) => setError(errorMessage(caught)),
  });

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    setError(null);

    const location = {
      ...(state.trim() ? { state: state.trim() } : {}),
      ...(district.trim() ? { district: district.trim() } : {}),
      ...(city.trim() ? { city: city.trim() } : {}),
      ...(pincode.trim() ? { pincode: pincode.trim() } : {}),
    };

    // Empty optional fields are omitted rather than sent as `''`: the server's
    // schema is strict, and an empty string is not a valid email or PIN code.
    mutation.mutate({
      name: name.trim(),
      type,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(leaderId ? { leaderId } : {}),
      ...(Object.keys(location).length > 0 ? { location } : {}),
      ...(contactEmail.trim() ? { contactEmail: contactEmail.trim() } : {}),
      ...(contactPhone.trim() ? { contactPhone: contactPhone.trim() } : {}),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create community</DialogTitle>
          <DialogDescription>
            A join code and QR are generated automatically. The community goes live immediately —
            leaders who create their own must wait for approval instead.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1" noValidate>
          {error && (
            <div
              role="alert"
              className="p-2.5 rounded bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-300 text-xs flex items-start gap-2"
            >
              <WarningCircle className="h-4 w-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <Field htmlFor="community-name" label="Community name">
            <Input
              id="community-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="गुप्ता समाज, Sector 14 RWA…"
              required
              minLength={3}
              maxLength={120}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field htmlFor="community-type" label="Type">
              <Select
                id="community-type"
                value={type}
                onChange={(e) => setType(e.target.value as CommunityType)}
              >
                {COMMUNITY_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {COMMUNITY_TYPE_LABELS[option]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field htmlFor="community-leader" label="Leader" optional>
              <Select
                id="community-leader"
                value={leaderId}
                onChange={(e) => setLeaderId(e.target.value)}
                disabled={leadersQuery.isPending}
              >
                <option value="">Assign later</option>
                {leaders.map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.fullName ?? leader.email ?? leader.id}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {leaders.length === 0 && !leadersQuery.isPending && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              No Leader accounts exist yet. Create one under Staff &amp; Roles, then assign it here
              or from the community page.
            </p>
          )}

          <Field htmlFor="community-description" label="Description" optional>
            <textarea
              id="community-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={2}
              className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-xs text-zinc-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="Shown to people before they join."
            />
          </Field>

          <fieldset className="space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            <legend className="text-[10px] uppercase tracking-wide text-zinc-400">
              Location (optional)
            </legend>

            <div className="grid grid-cols-2 gap-3">
              <Field htmlFor="community-state" label="State">
                <Input id="community-state" value={state} onChange={(e) => setState(e.target.value)} />
              </Field>
              <Field htmlFor="community-district" label="District">
                <Input
                  id="community-district"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
              </Field>
              <Field htmlFor="community-city" label="City">
                <Input id="community-city" value={city} onChange={(e) => setCity(e.target.value)} />
              </Field>
              <Field htmlFor="community-pincode" label="PIN code">
                <Input
                  id="community-pincode"
                  inputMode="numeric"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="grid grid-cols-2 gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            <legend className="text-[10px] uppercase tracking-wide text-zinc-400">
              Contact (optional)
            </legend>
            <Field htmlFor="community-email" label="Email">
              <Input
                id="community-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </Field>
            <Field htmlFor="community-phone" label="Phone">
              <Input
                id="community-phone"
                inputMode="tel"
                placeholder="9876543210"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </Field>
          </fieldset>

          <DialogFooter>
            <Button
              type="submit"
              size="sm"
              className="w-full h-9 text-xs"
              disabled={mutation.isPending || name.trim().length < 3}
            >
              {mutation.isPending ? 'Creating…' : 'Create community'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  htmlFor,
  label,
  optional,
  children,
}: {
  htmlFor: string;
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {optional && <span className="text-zinc-400"> (optional)</span>}
      </label>
      {children}
    </div>
  );
}
