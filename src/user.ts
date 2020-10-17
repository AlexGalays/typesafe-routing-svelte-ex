import * as v from 'idonttrustlikethat'

export type UserId = string & { _tag: 'UserId' }

export const userId = v.string.tagged<UserId>()
