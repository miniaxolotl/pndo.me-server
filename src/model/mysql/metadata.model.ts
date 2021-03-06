import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, JoinColumn, OneToMany, OneToOne} from "typeorm";
import { AlbumMetadataModel, CommentModel } from ".";

@Entity()
export default class Metadata {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: "varchar", unique: true, nullable: false })
	file_id!: string;

	@Column({ type: "varchar", nullable: false })
	filename!: string;

	@Column({ type: "varchar", nullable: false })
	type!: string;

	@Column({ type: "varchar", nullable: true })
	ext!: string;

	@Column({ type: "int", nullable: false })
	bytes!: number;

	@Column({ type: "varchar", nullable: false })
	sha256!: string;

	@Column({ type: "varchar", nullable: false })
	md5!: string;

	@Column({ type: "int", default: 0 })
	d_count!: number;

	@Column({ type: "int", default: 0 })
	v_count!: number;
	
	@Column({ type: "boolean", default: false, nullable: false })
	deleted!: boolean;

	@CreateDateColumn()
	create_date!: Date;

	/* relations */

}