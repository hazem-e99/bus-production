import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AdminSystemService } from './admin-system.service';
import { PurgeDatabaseDto } from './dto/purge-database.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { createApiResponse } from '../../common/interfaces/api-response.interface';

/**
 * Admin-only, highly destructive system operations. Protected by the app's global
 * JwtAuthGuard (authentication) and RolesGuard (authorization) — no @Public()
 * here, and access is restricted to the Admin role only.
 */
@Controller('api/Admin/System')
@Roles('Admin')
export class AdminSystemController {
  constructor(private readonly adminSystemService: AdminSystemService) {}

  @Post('purge')
  @HttpCode(200)
  async purge(@CurrentUser('userId') adminUserId: string, @Body() dto: PurgeDatabaseDto) {
    const result = await this.adminSystemService.purgeDatabase(String(adminUserId), dto);
    return createApiResponse(
      {
        atomic: result.atomic,
        deleted: result.deleted,
        preserved: {
          admin: result.preservedAdmin,
          settings: true,
        },
      },
      'Database data deleted successfully.',
      true,
    );
  }
}
