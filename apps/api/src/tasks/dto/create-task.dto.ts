import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MinLength(3)
  goal!: string;

  @IsOptional()
  @IsString()
  taskType?: string;
}
