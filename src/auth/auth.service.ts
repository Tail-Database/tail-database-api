import { Injectable } from '@nestjs/common';
import { getCurrentHour, sha256 } from 'src/util';

@Injectable()
export class AuthService {
    public getAuthorizationMessage(): string {
        return sha256(getCurrentHour().toISOString());
    }
}
