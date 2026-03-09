import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AiChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'], example: 'user' })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty({ example: 'Book a meeting tomorrow at 2pm for 1 hour called Team Sync' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string;
}

export class AiChatRequestDto {
  @ApiProperty({
    type: [AiChatMessageDto],
    description: 'Full conversation history. Pass up to 50 messages for multi-turn context.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AiChatMessageDto)
  messages: AiChatMessageDto[];

  @ApiProperty({ description: 'Google OAuth access token for Calendar API' })
  @IsString()
  @IsNotEmpty()
  googleAccessToken: string;

  @ApiProperty({ description: 'Google OAuth refresh token' })
  @IsString()
  @IsNotEmpty()
  googleRefreshToken: string;
}

export class AiChatResponseDto {
  @ApiProperty({
    example:
      "I've created the booking 'Team Sync' on Tuesday March 10 from 2:00 PM to 3:00 PM and added it to your Google Calendar!",
    description: "The assistant's natural language response",
  })
  reply: string;

  @ApiProperty({
    example: true,
    description: 'True if a booking was created or cancelled during this turn. Refresh your booking list when true.',
  })
  bookingsChanged: boolean;
}
