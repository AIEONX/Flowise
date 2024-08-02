/* eslint-disable */
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { ICredential } from '../../Interface'

@Entity()
export class Credential implements ICredential {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Column()
    credentialName: string

    @Column({ type: 'text' })
    encryptedData: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date

    @Column()
    isEncryptionKeyLost: boolean
}
