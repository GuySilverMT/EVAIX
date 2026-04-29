import { prisma } from '../db.js';
import { IRegistryClient } from "../interfaces/IRegistryClient.js";

export class RegistryClient implements IRegistryClient {
  async listServers(): Promise<{ name: