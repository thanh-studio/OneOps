import { Injectable, InternalServerErrorException } from "@nestjs/common";

@Injectable()
export class TenantContext {
  getTenantId(): string {
    const tenantId = process.env.DEFAULT_TENANT_ID?.trim();
    if (!tenantId) {
      throw new InternalServerErrorException(
        "DEFAULT_TENANT_ID chưa được cấu hình trên hệ thống.",
      );
    }
    return tenantId;
  }
}
