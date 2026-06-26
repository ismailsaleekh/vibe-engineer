import 'reflect-metadata';
import * as zod from 'zod';
import * as tsRestCore from '@ts-rest/core';
import * as tsRestNest from '@ts-rest/nest';
import * as nestCommon from '@nestjs/common';
import * as nestCore from '@nestjs/core';
import * as nestPlatformExpress from '@nestjs/platform-express';
import * as rxjs from 'rxjs';
import * as vitest from 'vitest';
import * as vitestCoverageV8 from '@vitest/coverage-v8';

void [
  zod,
  tsRestCore,
  tsRestNest,
  nestCommon,
  nestCore,
  nestPlatformExpress,
  rxjs,
  vitest,
  vitestCoverageV8,
];
