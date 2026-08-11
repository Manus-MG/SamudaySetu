import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/async_view.dart';
import '../../auth/domain/app_user.dart';
import '../application/community_providers.dart';
import '../domain/community.dart';
import '../domain/invite.dart';

/// The member directory, for a leader.
///
/// Search is server-side and debounced. Paging is a "load more" button rather
/// than infinite scroll: on a 2G connection an accidental scroll that fires
/// three requests is a real cost, and a button makes the fetch the user's
/// decision.
class MembersScreen extends ConsumerStatefulWidget {
  const MembersScreen({super.key});

  @override
  ConsumerState<MembersScreen> createState() => _MembersScreenState();
}

class _MembersScreenState extends ConsumerState<MembersScreen> {
  final TextEditingController _search = TextEditingController();
  Timer? _debounce;

  String _query = '';
  int _page = 1;

  /// Accumulated across pages, because "load more" appends rather than replaces.
  final List<AppUser> _loaded = <AppUser>[];

  @override
  void initState() {
    super.initState();
    _search.addListener(_onSearchChanged);
  }

  void _onSearchChanged() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (!mounted) return;
      final next = _search.text.trim();
      if (next == _query) return;

      // A new search invalidates the accumulated pages — appending page 1 of a
      // different query onto the previous results would interleave two lists.
      setState(() {
        _query = next;
        _page = 1;
        _loaded.clear();
      });
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search
      ..removeListener(_onSearchChanged)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final community = ref.watch(myCommunityProvider);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text('सदस्य', style: TextStyle(fontSize: 18)),
      ),
      body: SafeArea(
        child: AsyncView<Community?>(
          value: community,
          onRetry: () => ref.invalidate(myCommunityProvider),
          builder: (data) => data == null
              ? const Center(child: Text('कोई समुदाय नहीं मिला'))
              : _List(
                  communityId: data.id,
                  page: _page,
                  query: _query,
                  loaded: _loaded,
                  searchController: _search,
                  onLoadMore: () => setState(() => _page += 1),
                  onPageLoaded: (items) {
                    // Called during the build of the child, so the append has to
                    // be deferred — mutating state mid-build throws.
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      if (!mounted) return;
                      final known = _loaded.map((m) => m.id).toSet();
                      final fresh = items.where((m) => !known.contains(m.id)).toList();
                      if (fresh.isEmpty) return;
                      setState(() => _loaded.addAll(fresh));
                    });
                  },
                ),
        ),
      ),
    );
  }
}

class _List extends ConsumerWidget {
  const _List({
    required this.communityId,
    required this.page,
    required this.query,
    required this.loaded,
    required this.searchController,
    required this.onLoadMore,
    required this.onPageLoaded,
  });

  final String communityId;
  final int page;
  final String query;
  final List<AppUser> loaded;
  final TextEditingController searchController;
  final VoidCallback onLoadMore;
  final void Function(List<AppUser>) onPageLoaded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = ShadTheme.of(context);
    final result = ref.watch(
      communityMembersProvider((communityId: communityId, page: page, search: query)),
    );

    return Column(
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppTheme.pagePadding,
            8,
            AppTheme.pagePadding,
            12,
          ),
          child: TextField(
            controller: searchController,
            style: const TextStyle(fontSize: 16),
            decoration: InputDecoration(
              hintText: 'नाम या नंबर खोजें',
              prefixIcon: const Icon(Icons.search_rounded),
              filled: true,
              fillColor: theme.colorScheme.muted,
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide.none,
              ),
            ),
          ),
        ),

        Expanded(
          child: AsyncView<Paged<AppUser>>(
            value: result,
            onRetry: () => ref.invalidate(communityMembersProvider),
            loadingLabel: 'सदस्य लाए जा रहे हैं…',
            builder: (data) {
              onPageLoaded(data.items);

              // Prefer the accumulated list, falling back to this page while the
              // append is still one frame away.
              final members = loaded.isEmpty ? data.items : loaded;

              if (members.isEmpty) {
                return _Empty(hasQuery: query.isNotEmpty);
              }

              return ListView.separated(
                padding: const EdgeInsets.fromLTRB(
                  AppTheme.pagePadding,
                  0,
                  AppTheme.pagePadding,
                  AppTheme.pagePadding,
                ),
                itemCount: members.length + (data.hasMore ? 1 : 0),
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  if (index >= members.length) {
                    return Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: SizedBox(
                        height: AppTheme.minTapTarget,
                        child: ShadButton.outline(
                          onPressed: onLoadMore,
                          child: const Text('और दिखाएँ', style: TextStyle(fontSize: 16)),
                        ),
                      ),
                    );
                  }
                  return _MemberTile(member: members[index]);
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

class _MemberTile extends StatelessWidget {
  const _MemberTile({required this.member});

  final AppUser member;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.muted,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: <Widget>[
          Container(
            height: 44,
            width: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: theme.colorScheme.background,
              shape: BoxShape.circle,
            ),
            child: Text(member.initials, style: theme.textTheme.large),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  member.fullName ?? 'नाम नहीं दिया',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.large.copyWith(
                    height: AppTheme.devanagariLineHeight,
                  ),
                ),
                if (member.phone != null)
                  Text(member.phone!, style: theme.textTheme.muted),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.hasQuery});

  final bool hasQuery;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Text(
          hasQuery
              ? 'इस खोज से कोई सदस्य नहीं मिला।'
              : 'अभी कोई सदस्य नहीं जुड़ा। कोड या लिंक साझा करके शुरुआत करें।',
          textAlign: TextAlign.center,
          style: theme.textTheme.muted.copyWith(
            height: AppTheme.devanagariLineHeight,
          ),
        ),
      ),
    );
  }
}
