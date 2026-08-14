/// Hindi weekday, month and clock formatting, without `intl`.
///
/// `intl` ships every locale's data to satisfy what this app needs today: a
/// weekday name, a month name and a 12-hour clock, in one language. The
/// pubspec's rule is that a dependency has to earn its APK size, and this one
/// does not yet. Revisit the moment the app needs real locale-aware parsing,
/// number formatting or plural rules — hand-rolling those would be the mistake
/// this file is not.
///
/// Numerals stay Latin on purpose. Devanagari digits are correct but slower to
/// scan for most readers, and a date is glanced at rather than read aloud. The
/// join code is the opposite case — it *is* dictated over the phone — which is
/// why `Community.joinCodeHindi` exists and this file has no equivalent.
abstract final class HindiDate {
  /// Indexed by `DateTime.weekday`, which is 1-based and starts on Monday.
  static const List<String> _weekdays = <String>[
    'सोमवार',
    'मंगलवार',
    'बुधवार',
    'गुरुवार',
    'शुक्रवार',
    'शनिवार',
    'रविवार',
  ];

  /// Indexed by `DateTime.month`, which is 1-based.
  static const List<String> _months = <String>[
    'जनवरी',
    'फ़रवरी',
    'मार्च',
    'अप्रैल',
    'मई',
    'जून',
    'जुलाई',
    'अगस्त',
    'सितंबर',
    'अक्टूबर',
    'नवंबर',
    'दिसंबर',
  ];

  static String weekday(DateTime date) => _weekdays[date.weekday - 1];

  /// `अगस्त`. Used on its own by the compact date block in the events list.
  static String month(DateTime date) => _months[date.month - 1];

  /// `12 अगस्त`.
  static String dayMonth(DateTime date) => '${date.day} ${_months[date.month - 1]}';

  /// `बुधवार, 12 अगस्त`. The year is omitted deliberately — everything this app
  /// shows is within a few weeks, and a year on every row is noise.
  static String fullDate(DateTime date) => '${weekday(date)}, ${dayMonth(date)}';

  /// `शाम 5:30`. Hindi puts the part of day before the clock, unlike English's
  /// trailing am/pm.
  static String time(DateTime date) {
    final hour12 = date.hour % 12 == 0 ? 12 : date.hour % 12;
    final minute = date.minute.toString().padLeft(2, '0');
    return '${_partOfDay(date.hour)} $hour12:$minute';
  }

  /// `बुधवार, 12 अगस्त · शाम 5:30`.
  static String dateAndTime(DateTime date) => '${fullDate(date)} · ${time(date)}';

  /// Names the day when it is close enough to name, and falls back to the date.
  ///
  /// "आज" and "कल" are what a member actually says, and they read as far more
  /// urgent than a date they have to compare against today's. Beyond that the
  /// relative form stops helping — "9 दिन बाद" makes you do arithmetic that the
  /// date does not.
  ///
  /// Note that Hindi's "कल" means both yesterday and tomorrow; the surrounding
  /// context (an upcoming list vs a past one) disambiguates, and "परसों" is the
  /// same word for two days either side.
  static String relativeDay(DateTime date, {DateTime? now}) {
    final today = _startOfDay(now ?? DateTime.now());
    final days = _startOfDay(date).difference(today).inDays;

    return switch (days) {
      0 => 'आज',
      1 => 'कल',
      2 => 'परसों',
      -1 => 'कल',
      -2 => 'परसों',
      _ => fullDate(date),
    };
  }

  static String _partOfDay(int hour) {
    if (hour < 4) return 'रात';
    if (hour < 12) return 'सुबह';
    if (hour < 16) return 'दोपहर';
    if (hour < 20) return 'शाम';
    return 'रात';
  }

  /// India has no daylight saving, so midnight-truncating with the local
  /// constructor is exact here. This would need `toUtc` gymnastics in a locale
  /// that shifts its clocks.
  static DateTime _startOfDay(DateTime date) =>
      DateTime(date.year, date.month, date.day);
}
