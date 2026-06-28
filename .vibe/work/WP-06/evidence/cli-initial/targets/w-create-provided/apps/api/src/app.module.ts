import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module.js";
import { GoldenRecordsModule } from "./golden-records/golden-records.module.js";

// Root application module composing the health and sample/demo golden-records
// modules. Imports only domain/contracts/config-bound code (DL-16 import rules).
@Module({ imports: [HealthModule, GoldenRecordsModule] })
export class AppModule {}
