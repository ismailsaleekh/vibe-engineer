// @sample @demo @reference — golden-records module (DL-16 / DL-20A).
import { Controller, Get, Inject } from "@nestjs/common";
import { GoldenRecordsService } from "./golden-records.service.js";

@Controller("api/golden-records")
export class GoldenRecordsController {
  // The generated dev runtime uses tsx/esbuild, which does not emit TypeScript
  // decorator metadata. Keep Nest DI explicit instead of relying on reflected
  // constructor types.
  constructor(@Inject(GoldenRecordsService) private readonly service: GoldenRecordsService) {}

  @Get()
  public list(): readonly unknown[] {
    return this.service.list();
  }
}
