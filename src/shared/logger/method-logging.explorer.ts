import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { LOG_METHODS_METADATA } from './log-methods.decorator';
import { AppLoggerService } from './logger.service';

const WRAPPED_FLAG = '__loggedByMethodLoggingExplorer__';

@Injectable()
export class MethodLoggingExplorer implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly logger: AppLoggerService,
  ) {}

  onModuleInit(): void {
    const providers = this.discoveryService.getProviders();

    for (const wrapper of providers) {
      if (!this.isDecoratedProvider(wrapper)) {
        continue;
      }

      const instance = wrapper.instance as Record<string, unknown>;
      const prototype = Object.getPrototypeOf(instance) as Record<
        string,
        unknown
      >;
      const contextName =
        wrapper.metatype?.name ?? instance.constructor?.name ?? 'Unknown';

      const methodNames = this.metadataScanner.getAllMethodNames(prototype);
      for (const methodName of methodNames) {
        this.wrapMethod(prototype, contextName, methodName);
      }
    }
  }

  private isDecoratedProvider(wrapper: InstanceWrapper): boolean {
    if (!wrapper.instance || !wrapper.metatype) {
      return false;
    }
    return Boolean(
      this.reflector.get<boolean>(LOG_METHODS_METADATA, wrapper.metatype),
    );
  }

  private wrapMethod(
    prototype: Record<string, unknown>,
    contextName: string,
    methodName: string,
  ): void {
    if (methodName === 'constructor' || methodName.startsWith('_')) {
      return;
    }

    const original = prototype[methodName];
    if (typeof original !== 'function') {
      return;
    }
    if ((original as { [WRAPPED_FLAG]?: boolean })[WRAPPED_FLAG]) {
      return;
    }

    const logger = this.logger;

    const wrapped = function (this: unknown, ...args: unknown[]) {
      logger.logMethodStart(contextName, methodName, args);
      const startedAt = Date.now();

      let result: unknown;
      try {
        result = (original as (...a: unknown[]) => unknown).apply(this, args);
      } catch (error) {
        logger.logMethodError(
          contextName,
          methodName,
          error,
          Date.now() - startedAt,
        );
        throw error;
      }

      if (result instanceof Promise) {
        return (result as Promise<unknown>).then(
          (value) => {
            logger.logMethodEnd(
              contextName,
              methodName,
              value,
              Date.now() - startedAt,
            );
            return value;
          },
          (error) => {
            logger.logMethodError(
              contextName,
              methodName,
              error,
              Date.now() - startedAt,
            );
            throw error;
          },
        );
      }

      logger.logMethodEnd(
        contextName,
        methodName,
        result,
        Date.now() - startedAt,
      );
      return result;
    };

    (wrapped as { [WRAPPED_FLAG]?: boolean })[WRAPPED_FLAG] = true;
    prototype[methodName] = wrapped;
  }
}
