import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowsClockwise, Check, PencilSimple, WarningCircle, X } from '@phosphor-icons/react';
import { errorMessage } from '../../api/errors.ts';
import type { JoinKitDto } from '../../api/types.ts';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.ts';
import { communitiesApi, communityKeys } from './communities.api.ts';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Spinner } from '../../components/ui/spinner.tsx';

interface JoinCodeEditorProps {
  kit: JoinKitDto;
  onError: (message: string | null) => void;
}

/**
 * Choosing the community's code.
 *
 * Two ways, because they serve different people. A generated pair of Hindi words
 * is the safe default — pronounceable, memorable, always unique. A custom code is
 * better when the community's own name is the thing members already know, which
 * is most of the time for a samaj or an RWA: `GUPTASAMAJ` needs no explaining at
 * all.
 *
 * Availability is checked as the leader types, because discovering a name is
 * taken *after* committing to it is how a poster gets printed with a dead code.
 */
export function JoinCodeEditor({ kit, onError }: JoinCodeEditorProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [isConfirmingRotate, setIsConfirmingRotate] = useState(false);

  const debouncedDraft = useDebouncedValue(draft.trim(), 350);

  const applyKit = (next: JoinKitDto): void => {
    queryClient.setQueryData(communityKeys.joinKit(next.communityId), next);
    // The code is denormalised onto the community row, so the list and the detail
    // header are stale until this lands.
    void queryClient.invalidateQueries({ queryKey: communityKeys.all });
  };

  const availabilityQuery = useQuery({
    queryKey: communityKeys.codeCheck(kit.communityId, debouncedDraft),
    queryFn: () => communitiesApi.checkJoinCode(kit.communityId, debouncedDraft),
    // Two characters cannot be valid, so asking wastes a round trip and flashes
    // a "too short" message at someone who is mid-word.
    enabled: isEditing && debouncedDraft.length >= 3,
    staleTime: 30_000,
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: (code: string) => communitiesApi.setJoinCode(kit.communityId, code),
    onSuccess: (next) => {
      applyKit(next);
      setIsEditing(false);
      setDraft('');
      onError(null);
    },
    onError: (error: unknown) => onError(errorMessage(error)),
  });

  const rotateMutation = useMutation({
    mutationFn: () => communitiesApi.rotateJoinCode(kit.communityId),
    onSuccess: (next) => {
      applyKit(next);
      setIsConfirmingRotate(false);
      onError(null);
    },
    onError: (error: unknown) => onError(errorMessage(error)),
  });

  // Only trust a verdict that describes what is currently typed — otherwise the
  // Save button lights up on the previous keystroke's answer.
  const availability =
    debouncedDraft === draft.trim() && !availabilityQuery.isFetching
      ? availabilityQuery.data
      : undefined;

  const canSave = availability?.available === true && !saveMutation.isPending;

  if (!isEditing) {
    return (
      <div className="rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <CodeDisplay kit={kit} />

        <div className="flex items-center gap-2 px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => {
              setDraft(kit.joinCode);
              setIsEditing(true);
              onError(null);
            }}
          >
            <PencilSimple className="h-3.5 w-3.5" />
            Choose your own
          </Button>

          {isConfirmingRotate ? (
            <>
              <span className="flex-1 text-[11px] text-amber-700 dark:text-amber-400">
                The current code stops working at once. Members already in stay.
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setIsConfirmingRotate(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                disabled={rotateMutation.isPending}
                onClick={() => rotateMutation.mutate()}
              >
                {rotateMutation.isPending ? 'Changing…' : 'Yes, change it'}
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-zinc-500"
              onClick={() => setIsConfirmingRotate(true)}
            >
              <ArrowsClockwise className="h-3.5 w-3.5" />
              New words
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
      <label htmlFor="join-code-draft" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
        Your own code
      </label>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        Use something members already say out loud — the community&apos;s own name usually beats
        anything we could generate. English letters and numbers only.
      </p>

      <div className="flex items-center gap-2">
        <Input
          id="join-code-draft"
          autoFocus
          value={draft}
          maxLength={30}
          spellCheck={false}
          autoComplete="off"
          placeholder="GUPTASAMAJ"
          className="font-mono uppercase tracking-wider h-10 text-sm"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSave) saveMutation.mutate(draft.trim());
            if (e.key === 'Escape') setIsEditing(false);
          }}
        />
        <Button
          size="sm"
          className="h-10 text-xs shrink-0"
          disabled={!canSave}
          onClick={() => saveMutation.mutate(draft.trim())}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 text-xs shrink-0"
          onClick={() => {
            setIsEditing(false);
            setDraft('');
            onError(null);
          }}
        >
          Cancel
        </Button>
      </div>

      <CodeVerdict
        isChecking={availabilityQuery.isFetching || debouncedDraft !== draft.trim()}
        draft={draft.trim()}
        available={availability?.available}
        code={availability?.code}
        reason={availability?.reason}
      />
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

/**
 * The code itself, given the space it deserves.
 *
 * Word-per-chip rather than one string: someone reading this down a phone line
 * needs to see where one word ends and the next begins, and the Devanagari
 * underneath is for the many leaders who will read it out in Hindi anyway.
 */
function CodeDisplay({ kit }: { kit: JoinKitDto }): React.JSX.Element {
  return (
    <div className="px-3 py-4 text-center space-y-2">
      <div className="text-[10px] uppercase tracking-wide text-zinc-400">Join code</div>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        {kit.joinCodeWords.map((word, index) => (
          <React.Fragment key={word}>
            {index > 0 && <span className="text-zinc-300 dark:text-zinc-600 text-xl">-</span>}
            <span className="font-mono text-2xl font-semibold tracking-wide text-zinc-900 dark:text-zinc-100">
              {word}
            </span>
          </React.Fragment>
        ))}
      </div>

      {kit.joinCodeHindi && (
        <div className="text-lg text-zinc-600 dark:text-zinc-300">{kit.joinCodeHindi}</div>
      )}

      <div className="text-[11px] text-zinc-400">
        {kit.joinCodeIsCustom ? 'You chose this code' : 'Generated from common Hindi words'}
      </div>
    </div>
  );
}

interface CodeVerdictProps {
  isChecking: boolean;
  draft: string;
  available: boolean | undefined;
  code: string | undefined;
  reason: string | null | undefined;
}

/** One line of feedback under the input. Always occupies space, so nothing jumps. */
function CodeVerdict({
  isChecking,
  draft,
  available,
  code,
  reason,
}: CodeVerdictProps): React.JSX.Element {
  if (draft.length < 3) {
    return <p className="text-[11px] text-zinc-400 h-4">Keep typing…</p>;
  }

  if (isChecking) {
    return (
      <p className="text-[11px] text-zinc-400 h-4 flex items-center gap-1.5">
        <Spinner className="h-3 w-3" />
        Checking…
      </p>
    );
  }

  if (available === true) {
    return (
      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 h-4 flex items-center gap-1.5">
        <Check className="h-3.5 w-3.5" weight="bold" />
        <span>
          <span className="font-mono">{code}</span> is available
        </span>
      </p>
    );
  }

  if (available === false) {
    return (
      <p className="text-[11px] text-red-600 dark:text-red-400 h-4 flex items-center gap-1.5">
        <X className="h-3.5 w-3.5" weight="bold" />
        {reason ?? 'That code cannot be used'}
      </p>
    );
  }

  return (
    <p className="text-[11px] text-zinc-400 h-4 flex items-center gap-1.5">
      <WarningCircle className="h-3.5 w-3.5" />
      Could not check right now
    </p>
  );
}
