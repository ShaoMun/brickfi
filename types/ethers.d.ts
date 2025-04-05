// Type definitions for ethers.js v5
import { ethers } from 'ethers';

declare module 'ethers' {
  export const utils: {
    isAddress(address: string): boolean;
    getAddress(address: string): string;
    arrayify(hex: string): Uint8Array;
    hexlify(value: any): string;
    toUtf8Bytes(text: string): Uint8Array;
    toUtf8String(bytes: Uint8Array | string): string;
    keccak256(data: Uint8Array | string): string;
    id(text: string): string;
    solidityKeccak256(types: string[], values: any[]): string;
    concat(items: Array<Uint8Array | string>): Uint8Array;
    AbiCoder: any;
  };

  export namespace providers {
    export class Web3Provider extends ethers.providers.JsonRpcProvider {
      constructor(provider: any, network?: any);
      getSigner(addressOrIndex?: string | number): ethers.Signer;
    }
  }

  export class Contract {
    constructor(address: string, abi: any, providerOrSigner: ethers.providers.Provider | ethers.Signer);
    interface: ethers.utils.Interface;
    connect(providerOrSigner: ethers.providers.Provider | ethers.Signer): ethers.Contract;
  }

  export class Signer {
    getAddress(): Promise<string>;
    signMessage(message: Uint8Array | string): Promise<string>;
    connect(provider: ethers.providers.Provider): ethers.Signer;
  }
} 