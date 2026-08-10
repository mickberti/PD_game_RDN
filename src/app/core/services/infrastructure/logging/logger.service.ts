import { Injectable } from '@angular/core';
import { environment } from '../../../../../environments/environment';


export class LoggingLevel {
  public static NONE = 'None';
  public static VERBOSE = 'Verbose';
  public static INFO = 'Info';
  public static DEBUG = 'Debug';
  public static WARNINGS = 'Warnings';
  public static ERRORS = 'Errors';
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {

  private _level: LoggingLevel = LoggingLevel.WARNINGS;

  constructor() {
    this._level = environment.loggingLevel;
  }

  logError(message: any, ...optionalParams: any[]): void {
    this.log(message, LoggingLevel.ERRORS, ...optionalParams);
  }

  logWarning(message: any, ...optionalParams: any[]): void {
    this.log(message, LoggingLevel.WARNINGS, ...optionalParams);
  }

  logInfo(message: any, ...optionalParams: any[]): void {
    this.log(message, LoggingLevel.INFO, ...optionalParams);
  }

  logDebug(message: any, ...optionalParams: any[]): void {
    this.log(message, LoggingLevel.DEBUG, ...optionalParams);
  }

  logVerbose(message: any, ...optionalParams: any[]): void {
    this.log(message, LoggingLevel.VERBOSE, ...optionalParams);
  }

  log(message: any, level = LoggingLevel.WARNINGS, ...optionalParams: any[]): void {
    if (this.shouldLog(level)) {
      switch (level) {
        case LoggingLevel.ERRORS:
          console.error(message, ...optionalParams);
          break;
        case LoggingLevel.WARNINGS:
          console.warn(message, ...optionalParams);
          break;
        case LoggingLevel.INFO:
          console.info(message, ...optionalParams);
          break;
        case LoggingLevel.DEBUG:
          console.debug(message, ...optionalParams);
          break;
        default:
          console.log(message, ...optionalParams);
      }
    }
  }

  private shouldLog(level: LoggingLevel): boolean {
    if (this._level === LoggingLevel.NONE) {
      return false;
    } else if (this._level === LoggingLevel.ERRORS) {
      return level === LoggingLevel.ERRORS;
    } else if (this._level === LoggingLevel.WARNINGS) {
      return level === LoggingLevel.ERRORS || level === LoggingLevel.WARNINGS;
    } else if (this._level === LoggingLevel.INFO) {
      return level === LoggingLevel.ERRORS || level === LoggingLevel.WARNINGS || level === LoggingLevel.INFO;
    } else if (this._level === LoggingLevel.DEBUG) {
      return level === LoggingLevel.ERRORS || level === LoggingLevel.WARNINGS || level === LoggingLevel.INFO || level === LoggingLevel.DEBUG;
    } else {
      return true;
    }
  }

  set level(level: LoggingLevel) {
    this._level = level;
  }

  get level(): LoggingLevel {
    return this._level;
  }
}
