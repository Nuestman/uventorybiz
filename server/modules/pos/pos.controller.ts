import { createPosService, type PosService } from "./pos.service";

export function createPosController(service: PosService = createPosService()) {
  return service;
}

export type PosController = PosService;
