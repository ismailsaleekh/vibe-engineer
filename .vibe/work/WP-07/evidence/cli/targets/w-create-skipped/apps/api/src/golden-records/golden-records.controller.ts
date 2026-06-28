// @sample @demo @reference — golden-records module (DL-16 / DL-20A).
import { Controller, Get } from "@nestjs/common";
import { GoldenRecordsService } from "./golden-records.service.js";

@Controller("api/golden-records")
export class GoldenRecordsController {
  constructor(private readonly service: GoldenRecordsService) {}

  @Get()
  public list(): readonly unknown[] {
    return this.service.list();
  }
}
