import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn} from "typeorm";
import { UserModel } from ".";

@Entity()
export default class Session {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: "varchar", length: 36, unique: true, nullable: false })
	session_id!: string;

	@Column({ type: "boolean", default: true, nullable: false })
	valid!: boolean;

	@CreateDateColumn()
	create_date!: Date;

	@CreateDateColumn()
	expire_date!: Date;

	/* relations */

    @ManyToOne(() => UserModel, user => user.user_id)
	@JoinColumn({ name: "user_id", referencedColumnName: "user_id" })
	user!: UserModel;
}