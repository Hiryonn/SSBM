SPEC = dict(
    name='Samus', sheet='semisax.gif', face='left', credit='SemiJuggalo / Trajunk', sounds='Samus', height=62,
    anims=dict(
        idle=['0.0', '0.1', '0.2'], walk='13.0-13.8', run='11.0-11.9', crouch=['5.0'], jumpSquat=['5.0'],
        jump=['3.0', '3.1'], doubleJump='9.10-9.17', fall=['3.2'], land=['5.0'],
        shield=['5.1'], dodge=['3.4'], roll='12.1-12.8', hurt=['3.3'], hurtAir=['5.3'], tumble='10.0-10.3',
        lie=['12.0'], getup=['5.0'], taunt=['3.5'], win=['3.6'],
        jab=['0.3', '0.4'], ftilt=['6.0', '6.1'], utilt=['0.10', '0.11'], dtilt=['5.2', '5.4'], dash=['11.4', '6.3'],
        fsmash='7.0-7.3', usmash='8.10-8.13', dsmash='7.4-7.7',
        nair='10.0-10.3', fair=['6.4', '6.5'], uair=['8.14', '8.15'], dair=['12.0', '12.9'],
        neutralB=['0.13', '0.14', '0.15'], sideB=['6.6', '6.7', '6.8'], upB='9.10-9.17', downB='12.1-12.4',
        grab=['6.3', '6.4'], proj='16.9-16.12',
    ),
    times=dict(idle=16, walk=6, run=4, doubleJump=3, upB=3, roll=3, neutralB=[14, 6, 10], fsmash=4, usmash=4),
    proj_move=dict(move='neutralB', at=1, vx=6, vy=0, gravity=0.0, life=60, dmg=14, no_melee=True),
    moves=dict(upB=dict(vy=-9, helpless=True, hit=dict(dmg=10)), downB=dict(hit=dict(dmg=6)), sideB=dict(hit=dict(dmg=8))),
    stats=dict(weight=110, walkSpeed=1.2, runSpeed=2.7, jumpForce=8.6, doubleJumpForce=7.6, gravity=0.33),
)
