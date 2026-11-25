SPEC = dict(
    name='Knuckles', sheet='BattleKnuckles.gif', credit='Sonic Battle (SEGA) / SSF', region=(0, 0, 203, 1250), sounds='Knuckles', height=58,
    anims=dict(
        idle='0.0-0.3', walk='19.0-19.5', run=['21.0', '21.1', '21.2', '21.4'], crouch=['12.3'], jumpSquat=['12.3'],
        jump=['16.1'], doubleJump=['16.3', '2.3'], fall=['16.2'], land=['12.3'],
        shield=['12.0'], dodge=['12.4'], roll=['3.0', '3.2'], hurt=['14.4'], hurtAir=['14.3'], tumble=['16.3', '2.3'],
        lie=['12.4'], getup=['12.3'], taunt=['10.0', '10.1'], win=['23.0', '23.1'],
        jab=['1.0', '1.1', '1.2', '1.3'], ftilt=['2.0', '2.1', '2.2'], utilt=['6.1', '6.2'], dtilt=['12.3', '5.1'], dash=['14.0', '14.1'],
        fsmash=['29.0', '29.1', '29.2'], usmash=['24.1', '24.3'], dsmash=['4.0', '4.1'],
        nair=['2.3'], fair=['3.5'], uair=['6.2'], dair=['8.2'],
        neutralB=['30.0', '30.2', '30.5'], sideB=['31.0', '31.2', '32.1'], upB=['26.1', '26.2'], downB=['4.2', '4.3', '4.4'],
        grab=['1.0', '1.1'],
    ),
    times=dict(idle=10, walk=7, run=5, fsmash=[10, 5, 12], neutralB=[8, 6, 10], sideB=[10, 6, 10]),
    moves=dict(upB=dict(vy=-8, helpless=True), sideB=dict(vx=4, hit=dict(dmg=14)), neutralB=dict(hit=dict(dmg=12)),
               downB=dict(hit=dict(dmg=12, angle=60))),
    stats=dict(weight=108, walkSpeed=1.4, runSpeed=3.2, jumpForce=8.4, doubleJumpForce=7.6),
)
