// @sample @demo @reference — golden-records module (DL-16 / DL-20A).
import { Module } from "@nestjs/common";
import { GoldenRecordsController } from "./golden-records.controller.js";
import { GoldenRecordsService } from "./golden-records.service.js";

@Module({ controllers: [GoldenRecordsController], providers: [GoldenRecordsService] })
export class GoldenRecordsModule {}
