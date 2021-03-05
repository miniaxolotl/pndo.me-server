import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, JoinColumn, OneToMany, OneToOne} from "typeorm";
import { AlbumMetadataModel, CommentModel } from ".";

@Entity()
export default class Metadata {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: "varchar", unique: true, nullable: false })
	metadata_id!: string;

	@Column({ type: "varchar", nullable: false })
	title!: string;

	@Column({ type: "varchar", nullable: false })
	type!: string;

	@Column({ type: "int", nullable: false })
	bytes!: number;

	@Column({ type: "varchar", nullable: false })
	sha256!: string;

	@Column({ type: "varchar", nullable: false })
	md5!: string;

	@CreateDateColumn()
	create_date?: Date;

	/* relations */

}