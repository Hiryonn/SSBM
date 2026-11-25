SPEC = dict(
    name='Meta Knight', sheet='playablemetaknightyx1.gif', credit='SSF', sounds='Kirby', height=40,
    anims=dict(
        idle=['0.0'], walk=['1.0', '2.0'], run='2.0-2.5', crouch=['0.3'], jumpSquat=['0.0'],
        jump=['7.0'], doubleJump='7.0-7.4', fall=['7.4'], land=['0.0'],
        shield=['16.0'], dodge=['7.2'], roll=['7.6', '7.7'], hurt=['18.0'], hurtAir=['18.0'], tumble=['7.2', '7.3'],
        lie=['7.8'], getup=['0.0'], taunt=['10.0'], win=['2.7'],
        jab=['3.3', '3.4'], ftilt=['4.3', '4.4'], utilt=['5.2', '5.4'], dtilt=['7.8', '7.9'], dash=['8.0', '8.1', '8.3'],
        fsmash=['3.6', '3.7'], usmash=['5.5'], dsmash=['6.1', '6.3'],
        nair=['4.5', '4.6'], fair=['4.0', '4.1'], uair=['5.4'], dair=['6.0', '6.8'],
        neutralB='6.2-6.5', sideB=['8.4', '8.5'], upB=['5.4', '5.5'], downB=['6.13', '6.15'],
        grab=['3.0', '3.3'],
    ),
    times=dict(run=4, doubleJump=5, neutralB=3, upB=[5, 10]),
    moves=dict(upB=dict(vy=-9.5, helpless=True), sideB=dict(vx=8, hit=dict(dmg=11)), neutralB=dict(hit=dict(dmg=10))),
    stats=dict(weight=80, walkSpeed=1.3, runSpeed=3.0, jumpForce=8.0, doubleJumpForce=7.0, jumps=6, gravity=0.33),
)
