import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/storage_providers.dart';
import 'dio_client.dart';

final dioProvider = Provider<Dio>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return DioClient.create(
    storage: storage,
    onSessionExpired: storage.clear,
  );
});
