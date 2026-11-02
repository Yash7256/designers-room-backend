import { Global, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { AuthzCacheService } from './authz-cache.service.js';

@Global()
@Module({
  imports: [UsersModule],
  providers: [AuthzCacheService],
  exports: [AuthzCacheService],
})
export class AuthzCacheModule {}
