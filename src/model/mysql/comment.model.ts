import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, JoinColumn, ManyToOne, OneToOne} from "typeorm";
import { UserModel, AlbumModel, MetadataModel } from ".";

@Entity()
export default class Comment {
	@PrimaryGeneratedColumn()
	id!: number;
	
	@Column({ type: "text", nullable: false })
	message!: string;

	@CreateDateColumn()
	create_date!: Date;
	
	/* relations */

    @ManyToOne(() => UserModel, user => user.user_id)
	@JoinColumn({ name: "user_id", referencedColumnName: "user_id" })
	user!: UserModel;

    @OneToOne(() => AlbumModel, album => album.album_id)
	@JoinColumn({ name: "album_id", referencedColumnName: "album_id" })
	album!: AlbumModel;

    @ManyToOne(() => MetadataModel, metadata => metadata.file_id)
	@JoinColumn({ name: "file_id", referencedColumnName: "file_id" })
	metadata!: MetadataModel;
};