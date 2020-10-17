import { string, Ok, Err } from 'idonttrustlikethat'

export const intFromString = string.flatMap((str) => {
  const num = +str
  return Number.isInteger(num) ? Ok(num) : Err('Expected int, got:' + str)
})
