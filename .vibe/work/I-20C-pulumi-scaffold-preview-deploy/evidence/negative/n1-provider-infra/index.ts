// N1 fixture: imports a cloud provider package (forbidden in v1 provider-agnostic scaffold).
import * as aws from "@pulumi/aws";
export const r = new aws.s3.Bucket("b");
