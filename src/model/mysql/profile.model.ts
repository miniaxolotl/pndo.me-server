import {Entity, Column, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export default class Profile {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({type: "varchar", length: 128, unique: true, nullable: false})
	profile_id!: string;

	@Column({type: "varchar", length: 128, unique: true, nullable: false})
	username!: string;

	@Column({type: "varchar", length: 128, unique: true, nullable: false})
	email!: string;

	@Column({type: "varchar", length: 128, unique: false, nullable: false})
	password!: string;

	@Column({type: "varchar", length: 128, unique: true, nullable: false})
	display_name!: string;

	@Column({type: "boolean", default: false, nullable: false})
	admin!: boolean;

	@Column({type: "boolean", default: false, nullable: false})
	moderator!: boolean;

	@Column({type: "boolean", default: false, nullable: false})
	banned!: boolean;
}